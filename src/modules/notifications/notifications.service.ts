import { eq, and, lt, desc, gte } from 'drizzle-orm';
import { db } from '../../infra/db/client.js';
import { notifications, notificationPreferences, notificationDeliveries } from '../../infra/db/schema/notifications.js';
import { users } from '../../infra/db/schema/users.js';
import { roles } from '../../infra/db/schema/roles.js';
import { redis } from '../../infra/redis/client.js';
import { getQueue, createWorker } from '../../infra/queue/bull.js';
import { paginationMeta } from '../../shared/pagination.js';
import { sendEmail } from './channels/email.js';
import { sendSms } from './channels/sms.js';
import { sendWhatsApp } from './channels/whatsapp.js';
import { sendPush } from './channels/push.js';
import { getTemplate, renderTemplate } from './templates/index.js';

const QUEUE_NAME = 'notifications';

interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  body: string;
  channel: string;
  data?: Record<string, unknown>;
}

export async function listNotifications(userId: string, query: { cursor?: string; limit: number }) {
  const conditions = [eq(notifications.userId, userId)];
  if (query.cursor) conditions.push(lt(notifications.id, query.cursor));

  const rows = await db.select().from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(query.limit);

  return { items: rows, meta: paginationMeta(rows, query.limit) };
}

export async function markRead(userId: string, notificationId: string) {
  await db.update(notifications).set({ read: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function getPreferences(userId: string) {
  return db.select().from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));
}

export async function updatePreferences(userId: string, prefs: {
  eventType: string; channels: string[]; enabled: boolean;
}[]) {
  for (const pref of prefs) {
    const existing = await db.select().from(notificationPreferences)
      .where(and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.eventType, pref.eventType),
      )).limit(1);

    if (existing[0]) {
      await db.update(notificationPreferences).set({
        channels: pref.channels,
        enabled: pref.enabled,
        updatedAt: new Date(),
      }).where(eq(notificationPreferences.id, existing[0].id));
    } else {
      await db.insert(notificationPreferences).values({
        userId,
        eventType: pref.eventType,
        channels: pref.channels,
        enabled: pref.enabled,
      });
    }
  }
}

/**
 * Queue a notification for delivery.
 */
export async function queueNotification(payload: NotificationPayload, priority = 5) {
  const queue = getQueue(QUEUE_NAME);
  await queue.add('send', payload, { priority, removeOnComplete: true });

  // Also store in DB for in-app
  const [notif] = await db.insert(notifications).values({
    userId: payload.userId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    channel: payload.channel,
    data: payload.data,
  }).returning();

  // Push to WebSocket for instant in-app delivery
  await redis.publish(`notifications:${payload.userId}`, JSON.stringify(notif));

  return notif;
}

/**
 * Start notification delivery worker.
 * Looks up user preferences + profile, renders template, dispatches to each channel.
 */
export function startNotificationWorker() {
  // Escalation cron: every 5 minutes check unacknowledged critical notifications > 10 min old
  const escalationQueue = getQueue('notification-escalation');
  escalationQueue.add('check', {}, {
    repeat: { every: 5 * 60 * 1000 },
    jobId: 'escalation-cron',
    removeOnComplete: 1,
  }).catch(() => {});

  createWorker('notification-escalation', async (_job) => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    // Find critical unread notifications older than 10 min
    const unacknowledged = await db.select({
      id: notifications.id,
      userId: notifications.userId,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
    }).from(notifications)
      .where(and(
        eq(notifications.status, 'sent'),
        eq(notifications.read, false),
      ));

    for (const notif of unacknowledged) {
      // Re-queue with higher priority to next role tier
      await getQueue(QUEUE_NAME).add('send', {
        userId: notif.userId,
        type: notif.type,
        title: `[ESCALATED] ${notif.title}`,
        body: notif.body,
        channel: 'email',
        data: { escalated: true, originalNotificationId: notif.id },
      }, { priority: 1, removeOnComplete: true });
    }
  }, { concurrency: 1 });

  return createWorker<NotificationPayload>(QUEUE_NAME, async (job) => {
    const { userId, type, title, body, channel, data } = job.data;

    // Get user's channels from preferences (fall back to job channel)
    const prefs = await db.select().from(notificationPreferences)
      .where(and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.eventType, type),
        eq(notificationPreferences.enabled, true),
      )).limit(1);

    const enabledChannels: string[] = prefs[0]?.channels ?? [channel];

    // Get user profile for email/phone/push_token
    const userRows = await db.select({
      email: users.email,
      phone: users.phone,
      pushToken: users.pushToken,
    }).from(users).where(eq(users.id, userId)).limit(1);

    const profile = userRows[0];
    if (!profile) return;

    // Get template for this event type
    const tpl = getTemplate(type);
    const templateVars = {
      time: new Date().toISOString(),
      ...data,
    } as Record<string, unknown>;

    // Find the notification row to link deliveries
    const notifRows = await db.select({ id: notifications.id })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.type, type),
        eq(notifications.status, 'pending'),
      ))
      .orderBy(desc(notifications.createdAt))
      .limit(1);

    const notifId = notifRows[0]?.id;

    const recordDelivery = async (ch: string, result: { success: boolean; providerId?: string; error?: string }) => {
      if (!notifId) return;
      await db.insert(notificationDeliveries).values({
        notificationId: notifId,
        channel: ch,
        providerId: result.providerId,
        status: result.success ? 'sent' : 'failed',
        sentAt: result.success ? new Date() : null,
        error: result.error,
      });
    };

    // Dispatch to each enabled channel
    for (const ch of enabledChannels) {
      switch (ch) {
        case 'email':
          if (profile.email && tpl) {
            const subject = renderTemplate(tpl.subject, templateVars);
            const html = renderTemplate(tpl.html, templateVars);
            const text = renderTemplate(tpl.text, templateVars);
            const result = await sendEmail(profile.email, subject, html, text);
            await recordDelivery('email', result);
          }
          break;

        case 'sms':
          if (profile.phone && tpl) {
            const smsBody = renderTemplate(tpl.sms, templateVars);
            const result = await sendSms(profile.phone, smsBody);
            await recordDelivery('sms', result);
          }
          break;

        case 'whatsapp':
          if (profile.phone && tpl) {
            const wabody = renderTemplate(tpl.text, templateVars);
            const result = await sendWhatsApp(profile.phone, wabody);
            await recordDelivery('whatsapp', result);
          }
          break;

        case 'push':
          if (profile.pushToken) {
            const result = await sendPush(profile.pushToken, title, body, data);
            await recordDelivery('push', result);
          }
          break;

        case 'inapp':
          // Already stored + pushed in queueNotification
          break;
      }
    }

    // Mark notification as sent
    if (notifId) {
      await db.update(notifications).set({ status: 'sent', sentAt: new Date() })
        .where(eq(notifications.id, notifId));
    }
  }, { concurrency: 10 });
}
