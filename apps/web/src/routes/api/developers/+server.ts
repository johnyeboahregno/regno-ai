// /api/developers — register + list developer flavour identities.
import { json } from '@sveltejs/kit';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';
import { requireSession } from '@regno/auth';

export async function GET({ cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const db = await getDb();
  const items = await db.collection(Collections.DEVELOPERS).find({}).sort({ slug: 1 }).toArray();
  return json({ ok: true, developers: items.map((d) => ({ slug: d.slug, name: d.name })) });
}

export async function POST({ request, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { slug?: string; name?: string };
  const slug = String(body.slug ?? '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  const name = String(body.name ?? '').trim();
  if (!slug || !name) return json({ ok: false, error: 'slug and name are required' }, { status: 400 });
  const db = await getDb();
  await db.collection(Collections.DEVELOPERS).updateOne(
    { slug },
    { $set: { slug, name, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );
  return json({ ok: true, slug });
}
