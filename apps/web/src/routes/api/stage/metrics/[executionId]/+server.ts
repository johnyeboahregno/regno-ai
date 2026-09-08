// GET /api/stage/metrics/[executionId] — segmentation run's SENTINEL metrics:
// latency/phases from cortex_executions + cost/token spend from ai_usage.
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

  return json({
    ok: true,
    executionId,
    latency: {
      durationMs: exec.durationMs,
      phases: (exec.phases ?? []).map((p: { name: string; durationMs?: number }) => ({
        name: p.name,
        durationMs: p.durationMs,
      })),
    },
    cost: { totalCostUsd: cost, totalTokens: tokens, calls: usageRows.length },
    llm: { llmCalls: exec.llmCalls, servedPhases: exec.servedPhases, finalScore: exec.finalScore },
  });
}
