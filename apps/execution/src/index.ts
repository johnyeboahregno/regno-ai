/**
 * Execution server entry — starts the BullMQ workers.
 * Architecture mirrors docs/references/deploy.md (execution :3003).
 *
 * Phase 3 will wire PlanEngine → (agent, topology) → AgentExecutor loop,
 * QualityAuditor refine loop, and AgentMemoryService wisdom persistence.
 */
import { getRedis, recordAiUsage } from '@regno/db';
import { setUsageSink } from '@regno/ai';
import { startOrchestratorWorker } from './workers/orchestrator.js';
import { startNotificationsWorker } from './workers/notifications.js';
import { startProvisionWorker } from './workers/provision.js';

// Capture AI usage (tokens + cost) for every LLM call made by the worker.
setUsageSink((u) => {
  void recordAiUsage(u);
});

async function main() {
  const connection = getRedis();
  await connection.ping();

  const orchestrator = startOrchestratorWorker(connection);
  const notifications = startNotificationsWorker(connection);
  const provision = startProvisionWorker(connection);
  console.log('[execution] workers online — orchestrator + notifications + provision');

  const shutdown = async () => {
    console.log('[execution] shutting down…');
    await orchestrator.close();
    await notifications.close();
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
