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
    // Never crash the process when Redis is unreachable (e.g. local dev
    // without the docker stack). An unhandled 'error' event would otherwise
    // kill the server. Log once, then stay quiet — calls fail per-request
    // and the /api/health endpoint reports Redis as down.
    let warned = false;
    redis.on('error', (err: Error) => {
      if (!warned) {
        console.error(
          `[redis] unavailable: ${err.message} (start the stack with \`npm run db:up\` to fix this)`,
        );
        warned = true;
      }
    });
  }
  return redis;
}

export async function closeRedis(): Promise<void> {
  await redis?.quit();
  redis = null;
}
