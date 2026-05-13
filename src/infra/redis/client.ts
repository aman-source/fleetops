import Redis from 'ioredis';
import { env } from '../../env.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 10) return null;
    return Math.min(times * 200, 5_000);
  },
  lazyConnect: true,
});

// Separate connection for pub/sub (Redis requires dedicated connection for subscribers)
export const redisSub = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 10) return null;
    return Math.min(times * 200, 5_000);
  },
  lazyConnect: true,
});

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  await redis.quit();
  await redisSub.quit();
}
