// /api/artifacts — list auto-documented artifacts (what the architect built).
import { json } from '@sveltejs/kit';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';
import { requireSession } from '@regno/auth';

export async function GET({ cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const db = await getDb();
  const items = await db.collection(Collections.ARTIFACTS).find({}).sort({ createdAt: -1 }).limit(100).toArray();
  const artifacts = items.map((a) => ({
    taskId: a.taskId,
    title: a.title,
    agentSlug: a.agentSlug,
    prompt: a.prompt,
    createdAt: a.createdAt,
  }));
  return json({ ok: true, artifacts });
}
