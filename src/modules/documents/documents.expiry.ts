/**
 * Document expiry engine — BullMQ delayed jobs.
 *
 * On document create/renew:
 *   - Schedule reminder jobs at 90/60/30/7 days before expiry
 *   - Schedule auto-block job on expiry day
 *
 * On document renew:
 *   - Cancel old jobs by jobId pattern
 *   - Schedule new jobs for new expiry date
 *
 * Uses Redis sorted set internally — O(log N) insert, O(1) fire.
 */
import { eq, and, isNull } from 'drizzle-orm';
import { getQueue, createWorker } from '../../infra/queue/bull.js';
import { db } from '../../infra/db/client.js';
import { documents } from '../../infra/db/schema/documents.js';
import { vehicles } from '../../infra/db/schema/vehicles.js';

const QUEUE_NAME = 'document-expiry';

interface ExpiryReminderPayload {
  documentId: string;
  daysBefore: number;
  type: 'reminder' | 'expired';
}

export async function scheduleExpiryReminders(doc: {
  id: string;
  expiryDate: string;
  reminderDays: number[] | null;
  blocksOnExpiry: boolean;
}) {
  const queue = getQueue(QUEUE_NAME);
  const expiryDate = new Date(doc.expiryDate);
  const reminderDays = doc.reminderDays ?? [90, 60, 30, 7];

  // Schedule reminder jobs
  for (const daysBefore of reminderDays) {
    const fireAt = new Date(expiryDate);
    fireAt.setDate(fireAt.getDate() - daysBefore);

    if (fireAt.getTime() > Date.now()) {
      await queue.add(
        'expiry-reminder',
        { documentId: doc.id, daysBefore, type: 'reminder' } satisfies ExpiryReminderPayload,
        {
          delay: fireAt.getTime() - Date.now(),
          jobId: `${doc.id}-reminder-${daysBefore}d`,
          removeOnComplete: true,
        },
      );
    }
  }

  // Schedule auto-block on expiry day
  if (doc.blocksOnExpiry && expiryDate.getTime() > Date.now()) {
    await queue.add(
      'expiry-block',
      { documentId: doc.id, daysBefore: 0, type: 'expired' } satisfies ExpiryReminderPayload,
      {
        delay: expiryDate.getTime() - Date.now(),
        jobId: `${doc.id}-expired`,
        removeOnComplete: true,
      },
    );
  }
}

export async function cancelExpiryReminders(docId: string) {
  const queue = getQueue(QUEUE_NAME);
  const reminderDays = [90, 60, 30, 7];

  // Remove all scheduled jobs for this document
  const jobIds = [
    ...reminderDays.map((d) => `${docId}-reminder-${d}d`),
    `${docId}-expired`,
  ];

  for (const jobId of jobIds) {
    const job = await queue.getJob(jobId);
    if (job) await job.remove();
  }
}

/**
 * Start the expiry worker. Call once at server startup.
 */
export function startExpiryWorker() {
  return createWorker<ExpiryReminderPayload>(QUEUE_NAME, async (job) => {
    const { documentId, type } = job.data;

    // Fetch current document state
    const rows = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
      .limit(1);

    const doc = rows[0];
    if (!doc) return; // Document deleted, skip

    if (type === 'reminder') {
      // Update status to 'expiring' if still valid
      if (doc.status === 'valid') {
        await db
          .update(documents)
          .set({ status: 'expiring', updatedAt: new Date() })
          .where(eq(documents.id, documentId));
      }

      // TODO: Phase 9 — trigger notification to relevant users
      // await notificationQueue.add('doc-expiry-warning', { ... });
    }

    if (type === 'expired') {
      // Mark document as expired
      await db
        .update(documents)
        .set({ status: 'expired', updatedAt: new Date() })
        .where(eq(documents.id, documentId));

      // Auto-block vehicle if applicable
      if (doc.blocksOnExpiry && doc.entityType === 'vehicle') {
        await db
          .update(vehicles)
          .set({ status: 'expired_documents', updatedAt: new Date() })
          .where(eq(vehicles.id, doc.entityId));
      }

      // TODO: Phase 9 — trigger urgent notification
    }
  }, { concurrency: 3 });
}
