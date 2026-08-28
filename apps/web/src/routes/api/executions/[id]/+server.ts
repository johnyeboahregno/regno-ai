// GET /api/executions/[id] — fetch a single execution (for chat polling).
import { json } from '@sveltejs/kit';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';
import { requireSession } from '$lib/server/auth.js';

export async function GET({ params, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const doc = await db.collection(Collections.CORTEX_EXECUTIONS).findOne({ taskId: params.id });
  if (!doc) return json({ ok: true, execution: null });

  return json({
    ok: true,
    execution: {
      taskId: doc.taskId,
      agentSlug: doc.agentSlug,
      prompt: doc.prompt,
      depth: doc.depth,
      finalScore: doc.finalScore,
      status: doc.status,
      output: doc.output ?? '',
      error: doc.error ?? '',
      createdAt: doc.createdAt,
    },
  });
}
