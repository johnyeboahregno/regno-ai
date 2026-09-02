// /api/pipelines/runs — recent GENESIS pipeline run history.
import { json } from '@sveltejs/kit';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';
import { requireSession } from '@regno/auth';

export async function GET({ cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const db = await getDb();
  const items = await db
    .collection(Collections.PIPELINE_HISTORY)
    .find({})
    .sort({ startedAt: -1 })
    .limit(30)
    .toArray();
  const runs = items.map((r) => ({
    executionId: r.executionId,
    pipelineId: r.pipelineId,
    name: r.name,
    nodeCount: r.nodeCount,
    durationMs: r.durationMs,
    startedAt: r.startedAt,
  }));
  return json({ ok: true, runs });
}
