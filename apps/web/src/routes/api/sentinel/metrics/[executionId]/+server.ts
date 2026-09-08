// GET /api/sentinel/metrics/[executionId] — per-execution SENTINEL metrics:
// the execution record (latency, phases, llmCalls, servedPhases) merged with
// cost/token spend from ai_usage keyed by taskId.
import { json } from '@sveltejs/kit';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';

export async function GET({ params }) {
  const executionId = String(params.executionId ?? '');
  if (!executionId) return json({ ok: false, error: 'executionId is required' }, { status: 400 });

  const db = await getDb();
  const exec = await db.collection(Collections.CORTEX_EXECUTIONS).findOne({ taskId: executionId });
  if (!exec) return json({ ok: false, error: 'execution not found' }, { status: 404 });

  const usageRows = await db.collection(Collections.AI_USAGE).find({ taskId: executionId }).toArray();
  const cost = usageRows.reduce((s, u) => s + Number(u.cost ?? 0), 0);
  const tokens = usageRows.reduce((s, u) => s + Number(u.totalTokens ?? 0), 0);
  const inputTokens = usageRows.reduce((s, u) => s + Number(u.inputTokens ?? 0), 0);
  const outputTokens = usageRows.reduce((s, u) => s + Number(u.outputTokens ?? 0), 0);

  return json({
    ok: true,
    execution: {
      taskId: exec.taskId,
      agentSlug: exec.agentSlug,
      depth: exec.depth,
      status: exec.status,
      finalScore: exec.finalScore,
      llmCalls: exec.llmCalls,
      servedPhases: exec.servedPhases,
      servedFrom: exec.servedFrom,
      durationMs: exec.durationMs,
      startedAt: exec.startedAt,
      createdAt: exec.createdAt,
      phases: (exec.phases ?? []).map((p: { name: string; durationMs?: number }) => ({
        name: p.name,
        durationMs: p.durationMs,
      })),
    },
    cost: { totalCostUsd: cost, totalTokens: tokens, inputTokens, outputTokens, calls: usageRows.length },
  });
}
