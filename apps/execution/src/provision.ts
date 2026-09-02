/**
 * Provision-only execution entry — the Mothership's worker.
 * Starts only the BullMQ provision worker (no orchestrator / notifications),
 * so the control-plane VPS runs a minimal footprint.
 */
import { getRedis } from '@regno/db';
import { startProvisionWorker } from './workers/provision.js';

async function main() {
  const connection = getRedis();
  await connection.ping();

  const provision = startProvisionWorker(connection);
  console.log('[execution] provision worker online');

  const shutdown = async () => {
    console.log('[execution] shutting down…');
    await provision.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[execution] fatal', err);
  process.exit(1);
});
