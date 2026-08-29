// /api/pipelines/[id] — fetch, update, delete a saved GENESIS pipeline.
import { json } from '@sveltejs/kit';
import { getDb, ObjectId } from '@regno/db';
import { Collections } from '@regno/shared';
import { requireSession } from '$lib/server/auth.js';

export async function GET({ params, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (!ObjectId.isValid(params.id)) return json({ ok: false, error: 'Invalid id' }, { status: 400 });
  const db = await getDb();
  const doc = await db.collection(Collections.PIPELINES).findOne({ _id: new ObjectId(params.id) });
  if (!doc) return json({ ok: false, error: 'Not found' }, { status: 404 });
  return json({
    ok: true,
    pipeline: {
      id: String(doc._id),
      name: doc.name,
      nodes: doc.nodes ?? [],
      edges: doc.edges ?? [],
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    },
  });
}

export async function PUT({ params, request, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (!ObjectId.isValid(params.id)) return json({ ok: false, error: 'Invalid id' }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    nodes?: unknown[];
    edges?: unknown[];
  };
  const patch: Record<string, unknown> = {};
  if (typeof body.name === 'string') patch.name = body.name.trim();
  if (Array.isArray(body.nodes)) patch.nodes = body.nodes;
  if (Array.isArray(body.edges)) patch.edges = body.edges;
  patch.updatedAt = new Date();

  const db = await getDb();
  const res = await db
    .collection(Collections.PIPELINES)
    .findOneAndUpdate({ _id: new ObjectId(params.id) }, { $set: patch }, { returnDocument: 'after' });
  if (!res) return json({ ok: false, error: 'Not found' }, { status: 404 });
  return json({ ok: true, id: params.id });
}

export async function DELETE({ params, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (!ObjectId.isValid(params.id)) return json({ ok: false, error: 'Invalid id' }, { status: 400 });
  const db = await getDb();
  await db.collection(Collections.PIPELINES).deleteOne({ _id: new ObjectId(params.id) });
  return json({ ok: true, id: params.id });
}
