// /api/agents/[slug] — update/delete a Subject Matter Expert (SMA).
import { json } from '@sveltejs/kit';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';
import { requireSession } from '@regno/auth';

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function parseTags(input: unknown): string[] {
  const list = Array.isArray(input)
    ? input
    : typeof input === 'string' && input.trim()
      ? input.split(',')
      : [];
  return Array.from(new Set(list.map((t) => String(t).trim()).filter(Boolean)));
}

export async function PUT({ params, request, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'owner') return json({ ok: false, error: 'Admin only' }, { status: 403 });

  const currentSlug = String(params.slug ?? '').trim();
  if (!currentSlug) return json({ ok: false, error: 'slug is required' }, { status: 400 });
  if (currentSlug === 'base') return json({ ok: false, error: 'Base SMA cannot be edited' }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    description?: string;
    focusTags?: unknown;
    disciplines?: string[];
    languages?: string[];
    technologies?: string[];
    developer?: string;
  };
  const name = String(body.name ?? '').trim();
  if (!name) return json({ ok: false, error: 'name is required' }, { status: 400 });

  const nextSlug = slugify(name);
  if (!nextSlug) return json({ ok: false, error: 'name must contain letters/numbers' }, { status: 400 });
  if (nextSlug === 'base') return json({ ok: false, error: 'SMA name cannot resolve to base' }, { status: 400 });

  const db = await getDb();
  const existing = await db.collection(Collections.SMAS).findOne({ slug: currentSlug }, { projection: { _id: 1 } });
  if (!existing) return json({ ok: false, error: 'SMA not found' }, { status: 404 });
  if (nextSlug !== currentSlug) {
    const conflict = await db.collection(Collections.SMAS).findOne({ slug: nextSlug }, { projection: { _id: 1 } });
    if (conflict) return json({ ok: false, error: `SMA "${name}" already exists` }, { status: 409 });
  }

  const disciplines = Array.isArray(body.disciplines) ? body.disciplines.map(String) : [];
  const languages = Array.isArray(body.languages) ? body.languages.map(String) : [];
  const technologies = Array.from(
    new Set([
      ...(Array.isArray(body.technologies) ? body.technologies.map(String) : []),
      ...disciplines,
      ...languages,
    ]),
  );

  await db.collection(Collections.SMAS).updateOne(
    { slug: currentSlug },
    {
      $set: {
        slug: nextSlug,
        name,
        description: String(body.description ?? '').trim(),
        focusTags: parseTags(body.focusTags),
        disciplines,
        languages,
        technologies,
        developer: String(body.developer ?? 'base').trim() || 'base',
        updatedAt: new Date(),
      },
    },
  );

  return json({ ok: true, slug: nextSlug, name });
}

export async function DELETE({ params, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'owner') return json({ ok: false, error: 'Admin only' }, { status: 403 });

  const slug = String(params.slug ?? '').trim();
  if (!slug) return json({ ok: false, error: 'slug is required' }, { status: 400 });
  if (slug === 'base') return json({ ok: false, error: 'Base SMA cannot be deleted' }, { status: 400 });

  const db = await getDb();
  await db.collection(Collections.SMAS).deleteOne({ slug });
  return json({ ok: true, slug });
}
