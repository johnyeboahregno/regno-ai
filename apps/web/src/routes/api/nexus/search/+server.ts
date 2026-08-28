// POST /api/nexus/search — semantic search over the ingested knowledge base.
import { json } from '@sveltejs/kit';
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
    const res = await getQdrant().query(QdrantCollections.DOC_SEARCH, {
      query: vector,
      limit: 10,
      with_payload: true,
    });
    const results = (res.points ?? []).map((p) => {
      const payload = (p.payload ?? {}) as Payload;
      return {
        score: Number((p.score ?? 0).toFixed(3)),
        title: payload.title ?? 'Untitled',
        sourceUrl: payload.sourceUrl ?? '',
        text: (payload.text ?? '').slice(0, 300),
      };
    });
    return json({ ok: true, results });
  } catch (e) {
    return json({ ok: false, error: `Search failed: ${(e as Error).message}` }, { status: 500 });
  }
}
