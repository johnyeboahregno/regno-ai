/**
 * Queue producer — enqueue an Architect provisioning job on BullMQ.
 * Used by the web API; consumed by the execution worker (`workers/provision.ts`).
 */
import { Queue } from 'bullmq';
import { getRedis } from '@regno/db';
import { Queues } from '@regno/shared';

export function enqueueProvision(payload: { slug: string }) {
  const q = new Queue(Queues.PROVISION, { connection: getRedis() });
  return q.add('provision', payload);
}
