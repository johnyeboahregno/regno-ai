/**
 * Queue producer — enqueue a Cortex Flow execution on BullMQ.
 * Used by the web API; consumed by the execution worker.
 */
import { Queue, type JobsOptions } from 'bullmq';
import { getRedis } from '@regno/db';
import { Queues } from '@regno/shared';

export function enqueueOrchestrate(payload: unknown, opts?: JobsOptions) {
  const q = new Queue(Queues.ORCHESTRATE, { connection: getRedis() });
  return q.add('orchestrate', payload, opts);
}
