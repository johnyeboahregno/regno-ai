// GET /api/cortex/qdrant/browse — browse Qdrant collections + points for the
// CORTEX Vector DB dialog's Browse tab.
//
//   ?                 → list collections (name + exact point count)
//   ?collection=X&limit=20&offset=<json> → scroll points in collection X
//
// `offset` is a JSON-encoded next_page_offset token (number, string, or object)
// returned by the previous page — keyset pagination, matching Qdrant's scroll API.
import { json } from '@sveltejs/kit';
import { getQdrant } from '@regno/db';

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

type OffsetToken = number | string | Record<string, unknown> | null;

export async function GET({ url }: { url: URL }) {
  const collection = url.searchParams.get('collection');
  const q = getQdrant();

  // --- list collections (sidebar) ---
  if (!collection) {
    try {
      const res = await withTimeout(q.getCollections(), 6000, { collections: [] });
      const names = (res.collections ?? []).map((c: { name: string }) => c.name).sort();
      const collections = await Promise.all(
        names.map(async (name) => {
          try {
            const c = await withTimeout(q.count(name, { exact: true }), 5000, { count: 0 });
            return { name, points: c.count ?? 0 };
          } catch {
            return { name, points: 0 };
          }
        }),
      );
      return json({ ok: true, collections });
    } catch {
      return json({ ok: false, error: 'Qdrant unreachable', collections: [] });
    }
  }

  // --- scroll points ---
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? '20') || 20, 1), 50);
  let offset: OffsetToken;
  const rawOffset = url.searchParams.get('offset');
  if (rawOffset) {
    try {
      offset = JSON.parse(rawOffset) as OffsetToken;
    } catch {
      offset = null;
    }
  } else {
    offset = null;
  }

  try {
    const params: Record<string, unknown> = {
      limit,
      with_payload: true,
      with_vector: false,
    };
    if (offset !== null && offset !== undefined) params.offset = offset;

    const [countRes, scrollRes] = await Promise.all([
      withTimeout(q.count(collection, { exact: true }), 5000, { count: 0 }),
      withTimeout(
        q.scroll(collection, params as never) as unknown as Promise<{
          points: Array<{ id: number | string; payload?: Record<string, unknown> | null }>;
          next_page_offset?: OffsetToken;
        }>,
        8000,
        { points: [], next_page_offset: null },
      ),
    ]);

    const points = (scrollRes.points ?? []).map((p) => ({ id: p.id, payload: p.payload ?? {} }));
    return json({
      ok: true,
      collection,
      total: countRes.count ?? 0,
      limit,
      points,
      nextOffset: scrollRes.next_page_offset ?? null,
    });
  } catch {
    return json({ ok: false, error: 'Qdrant unreachable', collection, total: 0, limit, points: [], nextOffset: null });
  }
}
