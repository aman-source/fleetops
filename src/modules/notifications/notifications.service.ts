import { eq, and, lt, desc } from 'drizzle-orm';
import { db } from '../../infra/db/client.js';
import { notifications, notificationPreferences } from '../../infra/db/schema/notifications.js';
import { redis } from '../../infra/redis/client.js';
import { getQueue, createWorker } from '../../infra/queue/bull.js';
import { paginationMeta } from '../../shared/pagination.js';

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
 */
export function startNotificationWorker() {
  return createWorker<NotificationPayload>(QUEUE_NAME, async (job) => {
    const { channel, userId, title, body } = job.data;

    switch (channel) {
      case 'email':
        // TODO: nodemailer integration
        break;
      case 'sms':
        // TODO: Twilio/gateway integration
        break;
      case 'whatsapp':
        // TODO: WhatsApp Business API
        break;
      case 'push':
        // TODO: Expo push notifications
        break;
      case 'inapp':
        // Already stored in DB + pushed via WebSocket
        break;
    }

    // Mark as sent
    await db.update(notifications).set({
      status: 'sent',
      sentAt: new Date(),
    }).where(and(
      eq(notifications.userId, userId),
      eq(notifications.type, job.data.type),
      eq(notifications.status, 'pending'),
    ));
  }, { concurrency: 10 });
}
