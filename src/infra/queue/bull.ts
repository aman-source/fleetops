import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { env } from '../../env.js';

// Parse Redis URL for BullMQ connection (BullMQ doesn't accept URL strings)
function parseRedisUrl(url: string): ConnectionOptions {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379', 10),
    password: parsed.password || undefined,
  };
}

const connection = parseRedisUrl(env.REDIS_URL);

// Queue registry — add queues as modules need them
const queues = new Map<string, Queue>();

export function getQueue(name: string): Queue {
  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, { connection });
    queues.set(name, queue);
  }
  return queue;
}

export function createWorker<T>(
  queueName: string,
  processor: (job: { data: T; name: string; id?: string }) => Promise<void>,
  options?: { concurrency?: number },
): Worker {
  return new Worker(queueName, processor, {
    connection,
    concurrency: options?.concurrency ?? 5,
  });
}

export async function checkQueueHealth(): Promise<boolean> {
  try {
    const testQueue = getQueue('health-check');
    await testQueue.getJobCounts();
    return true;
  } catch {
    return false;
  }
}

export async function closeQueues(): Promise<void> {
  const closePromises = Array.from(queues.values()).map((q) => q.close());
  await Promise.all(closePromises);
  queues.clear();
}
