// GET /api/docs — list ingested docs grouped by domain (from cortex_index).
import { json } from '@sveltejs/kit';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';

export async function GET() {
  const db = await getDb();
  const items = await db
    .collection(Collections.CORTEX_INDEX)
    .find({}, { projection: { title: 1, domain: 1, sourceUrl: 1, status: 1 } })
    .limit(400)
    .toArray();

  const groups = new Map<string, Array<{ title: string; sourceUrl: string }>>();
  for (const it of items) {
    const domain = String(it.domain ?? 'root');
    const list = groups.get(domain) ?? [];
    list.push({ title: String(it.title ?? it.sourceUrl), sourceUrl: String(it.sourceUrl ?? '') });
    groups.set(domain, list);
  }

  const result = [...groups.entries()].map(([domain, docs]) => ({ domain, count: docs.length, docs }));
  return json({ ok: true, total: items.length, groups: result });
}
