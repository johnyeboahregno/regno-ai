// GET /api/stage/results/[executionId] — the segmentation run's output and phases.
import { json } from '@sveltejs/kit';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';

export async function GET({ params }) {
  const executionId = String(params.executionId ?? '');
  if (!executionId) return json({ ok: false, error: 'executionId is required' }, { status: 400 });

  const db = await getDb();
  const exec = await db.collection(Collections.CORTEX_EXECUTIONS).findOne({ taskId: executionId });
  if (!exec) return json({ ok: false, error: 'execution not found' }, { status: 404 });

  return json({
    ok: true,
    executionId,
    status: exec.status,
    agentSlug: exec.agentSlug,
    depth: exec.depth,
    finalScore: exec.finalScore,
    llmCalls: exec.llmCalls,
    servedPhases: exec.servedPhases,
    durationMs: exec.durationMs,
    output: exec.output ?? '',
    phases: exec.phases ?? [],
    error: exec.error ?? '',
  });
}
