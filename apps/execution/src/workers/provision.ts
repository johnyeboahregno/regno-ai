/**
 * Provision worker — consumes the BullMQ 'provision' queue and provisions a
 * developer Architect on a target machine (see packages/provision).
 * Publishes progress to the same `regno:events` channel the realtime SSE
 * server forwards to the browser.
 */
import { Worker, type ConnectionOptions } from 'bullmq';
import { getRedis } from '@regno/db';
import { Queues } from '@regno/shared';
import { provisionArchitect } from '@regno/provision';
import type Redis from 'ioredis';

const EVENTS_CHANNEL = 'regno:events';

export function startProvisionWorker(connection: ConnectionOptions | Redis) {
  const worker = new Worker(
    Queues.PROVISION,
    async (job) => {
      const { slug, wipe } = (job.data ?? {}) as { slug?: string; wipe?: boolean };
      if (!slug) throw new Error('job.data.slug is required');
      const redis = getRedis();
      const onEvent = (event: string, data: unknown) => {
        void redis.publish(EVENTS_CHANNEL, JSON.stringify({ event, data })).catch(() => {});
      };
      await provisionArchitect(slug, onEvent, wipe);
    },
    { connection, concurrency: 2 },
  );

  worker.on('completed', (job) => console.log('[provision] done', job.id));
  worker.on('failed', (job, err) => console.error('[provision] failed', job?.id, err.message));
  return worker;
}
