// /api/stage/projects — list + create STAGE projects (staged_projects).
import { json } from '@sveltejs/kit';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';
import { requireSession } from '@regno/auth';

export async function GET({ cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const db = await getDb();
  const items = await db.collection(Collections.STAGED_PROJECTS).find({}).sort({ createdAt: -1 }).limit(50).toArray();
  const projects = items.map((p) => ({
    id: String(p._id),
    name: p.name,
    status: p.status ?? 'draft',
    phases: p.phases ?? [],
    createdAt: p.createdAt,
  }));
  return json({ ok: true, projects });
}

export async function POST({ request, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { name?: string; description?: string };
  const name = String(body.name ?? '').trim();
  if (!name) return json({ ok: false, error: 'name is required' }, { status: 400 });
  const db = await getDb();
  const res = await db.collection(Collections.STAGED_PROJECTS).insertOne({
    name,
    description: String(body.description ?? ''),
    status: 'draft',
    phases: [],
    createdAt: new Date(),
  });
  return json({ ok: true, id: String(res.insertedId) });
}
