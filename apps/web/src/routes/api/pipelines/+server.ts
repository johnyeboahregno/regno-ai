// /api/pipelines — save + list visual pipelines (GENESIS).
import { json } from '@sveltejs/kit';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';
import { requireSession } from '$lib/server/auth.js';

export async function GET({ cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const db = await getDb();
  const items = await db.collection(Collections.PIPELINES).find({}).sort({ createdAt: -1 }).limit(50).toArray();
  const pipelines = items.map((p) => ({
    id: String(p._id),
    name: p.name,
    nodes: p.nodes ?? [],
    edges: p.edges ?? [],
    createdAt: p.createdAt,
  }));
  return json({ ok: true, pipelines });
}

export async function POST({ request, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { name?: string; nodes?: unknown[]; edges?: unknown[] };
  const name = String(body.name ?? '').trim();
  const nodes = Array.isArray(body.nodes) ? body.nodes : [];
  if (!name || nodes.length === 0) {
    return json({ ok: false, error: 'name and at least one node are required' }, { status: 400 });
  }

  const db = await getDb();
  const res = await db.collection(Collections.PIPELINES).insertOne({
    name,
    nodes,
    edges: Array.isArray(body.edges) ? body.edges : [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return json({ ok: true, id: String(res.insertedId) });
}
