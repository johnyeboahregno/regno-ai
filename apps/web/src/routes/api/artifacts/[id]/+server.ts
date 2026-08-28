// /api/artifacts/[id] — fetch one artifact's full markdown.
import { json } from '@sveltejs/kit';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';
import { requireSession } from '$lib/server/auth.js';

export async function GET({ params, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const db = await getDb();
  const doc = await db.collection(Collections.ARTIFACTS).findOne({ taskId: params.id });
  if (!doc) return json({ ok: false, error: 'Not found' }, { status: 404 });
  return json({ ok: true, artifact: { taskId: doc.taskId, title: doc.title, markdown: doc.markdown, createdAt: doc.createdAt } });
}
