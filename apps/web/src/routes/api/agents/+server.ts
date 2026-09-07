// /api/agents — list + create Subject Matter Agents (SMA).
// An SMA is a selectable agent profile for architect jobs — NOT a new stack/namespace.
// The single architect is the whole application; an SMA just changes the lens/focus of a job.
//
// POST accepts either:
//   { name, description?, focusTags?, disciplines?, languages?, technologies?, developer? }
//   — the classic structured form (used by the /app/agents admin UI + built-in activation), OR
//   { prompt } — a freeform brief (e.g. a prompt file dumped into the CLI via
//   `regno sma create --file <path>`); the LLM derives the structured profile.
import { json } from '@sveltejs/kit';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';
import { requireSession } from '@regno/auth';
import { slugify, upsertSma, normalizeSma, inferSmaFromPrompt, BUILTIN_SMAS } from '$lib/server/sma.js';

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
  // Built-in SMA templates the user hasn't activated yet (activating = POST).
  const activated = new Set(smas.map((s) => s.slug));
  const builtins = BUILTIN_SMAS.filter((b) => !activated.has(b.slug));
  return json({ ok: true, smas, builtins });
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
    prompt?: string;
  };

  const db = await getDb();

  // Freeform prompt → LLM-derive the profile (used by `regno sma create --file`).
  const prompt = String(body.prompt ?? '').trim();
  if (prompt && !String(body.name ?? '').trim()) {
    let inferred: Awaited<ReturnType<typeof inferSmaFromPrompt>>;
    try {
      inferred = await inferSmaFromPrompt(prompt);
    } catch (err) {
      console.error('[api/agents] prompt → SMA inference failed:', (err as Error).message);
      const msg = (err as Error).message ?? 'unknown error';
      // "no API keys configured" surfaces from @regno/ai chatWithFallback.
      const status = /API keys|key/i.test(msg) ? 503 : 422;
      return json({ ok: false, error: `Could not create SMA from prompt: ${msg}` }, { status });
    }
    const name = inferred.name;
    const slug = slugify(name);
    if (!slug) return json({ ok: false, error: 'LLM did not produce a usable name' }, { status: 422 });
    if (slug === 'base') return json({ ok: false, error: 'SMA name cannot resolve to base' }, { status: 422 });
    const created = await upsertSma(db, {
      name,
      description: inferred.description,
      focusTags: inferred.focusTags,
      disciplines: inferred.disciplines,
      languages: inferred.languages,
      technologies: [...inferred.disciplines, ...inferred.languages],
      developer: 'base',
    });
    return json({ ok: true, slug: created.slug, name: created.name, inferred: true });
  }

  // Classic structured create (upsert semantics preserved).
  const name = String(body.name ?? '').trim();
  if (!name) return json({ ok: false, error: 'name is required' }, { status: 400 });
  const slug = slugify(name);
  if (!slug) return json({ ok: false, error: 'name must contain letters/numbers' }, { status: 400 });

  const def = normalizeSma(body);
  await upsertSma(db, def);
  return json({ ok: true, slug, name });
}
