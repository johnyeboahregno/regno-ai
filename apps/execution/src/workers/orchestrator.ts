/**
 * Orchestrator worker — runs the Cortex Flow pipeline (docs/cortex-flow-design.md §2).
 * Consumes BullMQ 'orchestrate' jobs; publishes progress events to Redis for the
 * realtime SSE server.
 */
import { Worker, type ConnectionOptions } from 'bullmq';
import { getRedis, getDb } from '@regno/db';
import { Queues, Collections } from '@regno/shared';
import { runExecution } from '@regno/flow';
import type Redis from 'ioredis';

const EVENTS_CHANNEL = 'regno:events';

export function startOrchestratorWorker(connection: ConnectionOptions | Redis) {
  const worker = new Worker(
    Queues.ORCHESTRATE,
    async (job) => {
      const { prompt, settings } = (job.data ?? {}) as { prompt?: string; settings?: Record<string, unknown> };
      if (!prompt) throw new Error('job.data.prompt is required');

      const redis = getRedis();
      const onEvent = (event: string, data: unknown) => {
        void redis.publish(EVENTS_CHANNEL, JSON.stringify({ event, data })).catch(() => {});
      };

      const executionId = String(job.id);
      try {
        return await runExecution(prompt, settings ?? {}, onEvent, executionId);
      } catch (err) {
        // Persist a failed record so clients polling by job id get a result.
        try {
          const db = await getDb();
          await db.collection(Collections.CORTEX_EXECUTIONS).insertOne({
            taskId: executionId,
            prompt,
            status: 'failed',
            error: (err as Error).message,
            createdAt: new Date(),
          });
        } catch {
          /* ignore persistence failure */
        }
        throw err;
      }
    },
    { connection, concurrency: 2 },
  );

  worker.on('completed', (job) => console.log('[orchestrator] done', job.id));
  worker.on('failed', (job, err) => console.error('[orchestrator] failed', job?.id, err.message));
  return worker;
}
