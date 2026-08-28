// /api/cortex/patterns — list + create CORTEX patterns (three-store sync).
import { json } from '@sveltejs/kit';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';
import { createPattern } from '@regno/cortex';
import { requireSession } from '$lib/server/auth.js';

export async function GET({ cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const db = await getDb();
  const items = await db.collection(Collections.CORTEX_PATTERNS).find({}).sort({ createdAt: -1 }).limit(50).toArray();
  const patterns = items.map((p) => ({
    id: String(p._id),
    name: p.name,
    description: p.description,
    tags: p.tags ?? [],
    confidence: p.confidence,
  }));
  return json({ ok: true, patterns });
}

export async function POST({ request, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    description?: string;
    tags?: string[];
  };
  const name = String(body.name ?? '').trim();
  const description = String(body.description ?? '').trim();
  if (!name || !description) {
    return json({ ok: false, error: 'name and description are required' }, { status: 400 });
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const id = `${slug}-${Date.now()}`;
  await createPattern({
    id,
    name,
    description,
    tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
  });
  return json({ ok: true, id });
}
