// /api/personas — create + list personas (base + developer flavour profiles).
import { json } from '@sveltejs/kit';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';
import { requireSession } from '@regno/auth';

export async function GET({ cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const db = await getDb();
  const items = await db.collection(Collections.PERSONAS).find({}).sort({ isBase: -1, slug: 1 }).toArray();
  const personas = items.map((p) => ({
    slug: p.slug,
    name: p.name,
    developer: p.developer ?? 'base',
    isBase: Boolean(p.isBase),
  }));
  // Always expose the built-in base persona.
  if (!personas.some((p) => p.slug === 'base')) {
    personas.unshift({ slug: 'base', name: 'Base Regno Architect', developer: 'base', isBase: true });
  }
  return json({ ok: true, personas });
}

export async function POST({ request, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    slug?: string;
    name?: string;
    developer?: string;
  };
  const slug = String(body.slug ?? '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  const name = String(body.name ?? '').trim();
  const developer = String(body.developer ?? 'base').trim();
  if (!slug || !name) return json({ ok: false, error: 'slug and name are required' }, { status: 400 });

  const db = await getDb();
  await db.collection(Collections.PERSONAS).updateOne(
    { slug },
    { $set: { slug, name, developer, isBase: slug === 'base', updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );
  return json({ ok: true, slug });
}
