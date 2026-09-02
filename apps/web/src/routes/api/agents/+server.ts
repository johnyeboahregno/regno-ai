// /api/agents — list + create Subject Matter Experts (SMA).
// An SMA is a selectable expert profile for architect jobs — NOT a new stack/namespace.
// The single architect is the whole application; an SMA just changes the lens/focus of a job.
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

export async function GET({ cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const db = await getDb();
  const items = await db.collection(Collections.SMAS).find({}).sort({ createdAt: -1 }).toArray();
  const smas = items.map((s) => ({
    slug: s.slug,
    name: s.name,
    description: s.description ?? '',
    focusTags: s.focusTags ?? [],
    technologies: s.technologies ?? [],
    disciplines: s.disciplines ?? [],
    languages: s.languages ?? [],
    developer: s.developer ?? 'base',
    createdAt: s.createdAt ?? null,
  }));
  // Always expose the built-in base SMA (the default architect — no specific focus area).
  if (!smas.some((s) => s.slug === 'base')) {
    smas.unshift({
      slug: 'base',
      name: 'Base Regno Architect',
      description: 'The default architect — no specific focus area.',
      focusTags: [],
      technologies: [],
      disciplines: [],
      languages: [],
      developer: 'base',
      createdAt: null,
    });
  }
  return json({ ok: true, smas });
}

export async function POST({ request, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'owner') return json({ ok: false, error: 'Admin only' }, { status: 403 });

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
  const slug = slugify(name);
  if (!slug) return json({ ok: false, error: 'name must contain letters/numbers' }, { status: 400 });

  const focusTags = parseTags(body.focusTags);
  const disciplines = Array.isArray(body.disciplines) ? body.disciplines.map(String) : [];
  const languages = Array.isArray(body.languages) ? body.languages.map(String) : [];
  const technologies = Array.from(
    new Set([
      ...(Array.isArray(body.technologies) ? body.technologies.map(String) : []),
      ...disciplines,
      ...languages,
    ]),
  );
  const developer = String(body.developer ?? 'base').trim() || 'base';

  const db = await getDb();
  const now = new Date();
  await db.collection(Collections.SMAS).updateOne(
    { slug },
    {
      $set: {
        slug,
        name,
        description: String(body.description ?? '').trim(),
        focusTags,
        disciplines,
        languages,
        technologies,
        developer,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
  return json({ ok: true, slug, name });
}
