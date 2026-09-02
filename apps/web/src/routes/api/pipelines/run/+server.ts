// /api/pipelines/run — start a GENESIS pipeline execution.
// POST { name?, nodes, edges, pipelineId? } → { ok, executionId }
// Stream progress via GET /api/pipelines/run/[executionId]/events
import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { requireSession } from '@regno/auth';
import { runPipeline, type RunRequest } from '$lib/pipeline/executor.js';

export async function POST({ request, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as RunRequest;
  const nodes = Array.isArray(body.nodes) ? body.nodes : [];
  if (nodes.length === 0) {
    return json({ ok: false, error: 'Add at least one node before running' }, { status: 400 });
  }

  const executionId = randomUUID();
  // Fire-and-forget: the executor pushes events to the in-memory SSE bus.
  void runPipeline(body, () => {}, executionId);

  return json({ ok: true, executionId, name: body.name ?? 'untitled' });
}
