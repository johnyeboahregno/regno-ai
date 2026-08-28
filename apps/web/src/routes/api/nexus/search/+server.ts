// POST /api/nexus/search — semantic search over the architect's OWN knowledge
// plus the shared BASE knowledge (read-only), so each architect can learn from
// the base while keeping its own private knowledge.
import { json } from '@sveltejs/kit';
import { QdrantClient } from '@qdrant/js-client-rest';
import { getQdrant } from '@regno/db';
import { QdrantCollections } from '@regno/shared';
import { embed } from '@regno/ai';
import { requireSession } from '$lib/server/auth.js';

interface Payload {
  title?: string;
  text?: string;
  sourceUrl?: string;
}

export async function POST({ request, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { query?: string };
  const query = String(body.query ?? '').trim();
  if (!query) return json({ ok: false, error: 'query is required' }, { status: 400 });

  try {
    const vector = await embed(query);
    const hits: Array<{ id: unknown; score: number; payload: Payload | null; source: 'own' | 'base' }> = [];

    // 1. Own knowledge (this architect's Qdrant).
    const own = await getQdrant().query(QdrantCollections.DOC_SEARCH, {
      query: vector,
      limit: 8,
      with_payload: true,
    });
    for (const p of own.points ?? []) hits.push({ id: p.id, score: p.score ?? 0, payload: (p.payload ?? {}) as Payload, source: 'own' });

    // 2. Base knowledge (read-only, cross-namespace).
    const baseUrl = process.env.BASE_QDRANT_URL;
    if (baseUrl) {
      try {
        const base = new QdrantClient({ url: baseUrl });
        const br = await base.query(QdrantCollections.DOC_SEARCH, {
          query: vector,
          limit: 8,
          with_payload: true,
        });
        for (const p of br.points ?? []) hits.push({ id: p.id, score: p.score ?? 0, payload: (p.payload ?? {}) as Payload, source: 'base' });
      } catch {
        /* base unavailable — own results only */
      }
    }

    // Dedupe (same chunk id from own + base) and sort by score.
    const seen = new Set<string>();
    const results = hits
      .sort((a, b) => b.score - a.score)
      .filter((h) => {
        const key = String(h.id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((h) => ({
        score: Number(h.score.toFixed(3)),
        title: h.payload?.title ?? 'Untitled',
        sourceUrl: h.payload?.sourceUrl ?? '',
        text: (h.payload?.text ?? '').slice(0, 300),
        source: h.source,
      }));

    return json({ ok: true, results });
  } catch (e) {
    return json({ ok: false, error: `Search failed: ${(e as Error).message}` }, { status: 500 });
  }
}
