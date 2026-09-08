/**
 * SENTINEL activity log — persisted lifecycle events for every Cortex Flow run.
 *
 * The realtime SSE stream publishes events for live UIs; this is the durable
 * mirror used by the SENTINEL dashboard for activity logging (and later for
 * anomaly/audit work). Cost/token telemetry stays in `ai_usage`; latency and
 * per-phase timing stay in `cortex_executions`. This collection is the
 * event/activity trail only.
 */
import { getDb } from './mongo.js';
import { Collections } from '@regno/shared';

export interface SentinelActivity {
  executionId: string;
  event: string;
  data?: Record<string, unknown>;
  ts?: Date;
}

/** Persist one activity event (best-effort — never throws to callers). */
export async function recordSentinelActivity(a: SentinelActivity): Promise<void> {
  try {
    const db = await getDb();
    await db.collection(Collections.SENTINEL_METRICS).insertOne({
      executionId: a.executionId,
      event: a.event,
      data: a.data ?? null,
      ts: a.ts ?? new Date(),
    });
  } catch (e) {
    console.warn('[sentinel] recordSentinelActivity skipped:', (e as Error).message);
  }
}
