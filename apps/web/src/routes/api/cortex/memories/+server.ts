// /api/cortex/memories — list + create agent memories.
import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';
import { remember } from '@regno/cortex';
import { requireSession } from '$lib/server/auth.js';

export async function GET({ cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const db = await getDb();
  const items = await db.collection(Collections.CORTEX_AGENT_MEMORIES).find({}).sort({ updatedAt: -1 }).limit(50).toArray();
  const memories = items.map((m) => ({
    id: String(m._id),
    agentSlug: m.agentSlug,
    category: m.category,
    content: m.content,
    createdAt: m.createdAt,
  }));
  return json({ ok: true, memories });
}

export async function POST({ request, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    content?: string;
    category?: string;
    agentSlug?: string;
  };
  const content = String(body.content ?? '').trim();
  if (!content) return json({ ok: false, error: 'content is required' }, { status: 400 });

  const id = randomUUID();
  await remember({
    id,
    agentSlug: String(body.agentSlug ?? 'regno-architect'),
    category: String(body.category ?? 'note'),
    content,
  });
  return json({ ok: true, id });
}
