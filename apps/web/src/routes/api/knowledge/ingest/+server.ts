// POST /api/knowledge/ingest — start a knowledge ingestion seed (fire-and-forget).
// Body: { url, name?, domain?, description?, maxPages?, depth?, phases?, llm?, assets? }
// Returns: { ok, seedId } — poll GET /api/knowledge/ingest/[seedId] for progress.
import { json } from '@sveltejs/kit';
import { startSeed, deriveDomain, ALL_PHASES } from '@regno/ingest';
import type { PhaseName } from '@regno/ingest';

export async function POST({ request }) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    /* empty body ok */
  }

  const url = String(body.url ?? '').trim();
  if (!url) return json({ ok: false, error: 'url is required' }, { status: 400 });
  try {
    new URL(url);
  } catch {
    return json({ ok: false, error: 'url must be a valid absolute URL (https://…)' }, { status: 400 });
  }

  const phases = Array.isArray(body.phases)
    ? (body.phases as string[]).filter((p): p is PhaseName => (ALL_PHASES as string[]).includes(p))
    : undefined;

  const input = {
    url,
    name: body.name ? String(body.name) : undefined,
    domain: body.domain ? String(body.domain) : undefined,
    description: body.description ? String(body.description) : undefined,
    maxPages: body.maxPages ? Number(body.maxPages) : undefined,
    depth: body.depth ? Number(body.depth) : undefined,
    phases: phases?.length ? phases : undefined,
    llm: body.llm === undefined ? undefined : Boolean(body.llm),
    assets: body.assets === undefined ? undefined : Boolean(body.assets),
  };

  const seedId = startSeed(input, (p) => console.log(`[ingest:${p.seedId}] ${Math.round(p.progress * 100)}% ${p.phase}: ${p.stage}`));

  return json({ ok: true, seedId, domain: deriveDomain(url) });
}
