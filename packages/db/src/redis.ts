/**
 * Redis client — queues (BullMQ), pub/sub, cache.
 */
import Redis from 'ioredis';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null, // required by BullMQ
      lazyConnect: false,
    });
  }
  return redis;
}

export async function closeRedis(): Promise<void> {
  await redis?.quit();
  redis = null;
}
