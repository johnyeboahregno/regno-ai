// /api/agents/[slug] — delete a Subject Matter Expert (SMA).
import { json } from '@sveltejs/kit';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';
import { requireSession } from '$lib/server/auth.js';

export async function DELETE({ params, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'owner') return json({ ok: false, error: 'Admin only' }, { status: 403 });

  const slug = String(params.slug ?? '').trim();
  if (!slug) return json({ ok: false, error: 'slug is required' }, { status: 400 });

  const db = await getDb();
  await db.collection(Collections.SMAS).deleteOne({ slug });
  return json({ ok: true, slug });
}
