/**
 * Queue producer — enqueue an Architect provisioning or data-seed job on BullMQ.
 * Used by the web API; consumed by the execution worker (`workers/provision.ts`).
 */
import { Queue } from 'bullmq';
import { getRedis } from '@regno/db';
import { Queues } from '@regno/shared';

function provisionQueue() {
  return new Queue(Queues.PROVISION, { connection: getRedis() });
}

/** Full deploy/provision of an Architect (wipe flag is optional). */
export function enqueueProvision(payload: { slug: string; wipe?: boolean }) {
  return provisionQueue().add('provision', payload);
}

/** Re-seed an Architect's data layer (docs brain, etc.) without a rebuild/restart. */
export function enqueueSeed(slug: string) {
  return provisionQueue().add('seed', { slug });
}
