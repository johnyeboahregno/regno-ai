// Enqueue a Cortex Flow execution (docs/cortex-flow-design.md §2).
// POST /api/executions { "prompt": "...", "settings": { ... } }
// GET  /api/executions — list recent executions.
import { json } from '@sveltejs/kit';
import { enqueueOrchestrate } from '@regno/flow';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';
import { requireSession } from '$lib/server/auth.js';

export async function POST({ request, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    prompt?: string;
    settings?: Record<string, unknown>;
  };

  const prompt = body?.prompt;
  if (!prompt || typeof prompt !== 'string') {
    return json({ ok: false, error: 'prompt is required' }, { status: 400 });
  }

  const job = await enqueueOrchestrate({ prompt, settings: body.settings ?? {} });
  return json({ ok: true, jobId: job.id });
}

export async function GET() {
  const db = await getDb();
  const items = await db
    .collection(Collections.CORTEX_EXECUTIONS)
    .find({})
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();
  const executions = items.map((e) => ({
    taskId: e.taskId,
    agentSlug: e.agentSlug,
    prompt: e.prompt,
    depth: e.depth,
    finalScore: e.finalScore,
    status: e.status,
    createdAt: e.createdAt,
  }));
  return json({ ok: true, executions });
}
