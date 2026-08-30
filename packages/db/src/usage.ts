/**
 * AI usage records — token + cost telemetry for every LLM call (chat + embed).
 * Written by the usage sink installed in each process (web server, execution worker).
 * Collection: ai_usage (see docs/DB_SCHEMA.md §2 pattern).
 */
import { getDb } from './mongo.js';
import { Collections } from '@regno/shared';

export interface AiUsageRecord {
  provider: 'openai' | 'anthropic' | 'google' | 'deepseek';
  model: string;
  kind: 'chat' | 'embed';
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  ts: string;
  taskId?: string;
}

/** Persist a single usage record (best-effort — never throws to callers). */
export async function recordAiUsage(u: AiUsageRecord): Promise<void> {
  try {
    const db = await getDb();
    await db.collection(Collections.AI_USAGE).insertOne({
      provider: u.provider,
      model: u.model,
      kind: u.kind,
      inputTokens: u.inputTokens,
      outputTokens: u.outputTokens,
      totalTokens: u.totalTokens,
      cost: u.cost,
      taskId: u.taskId ?? null,
      ts: new Date(u.ts),
      day: u.ts.slice(0, 10),
    });
  } catch (e) {
    console.warn('[usage] recordAiUsage skipped:', (e as Error).message);
  }
}
