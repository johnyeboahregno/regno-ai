// GET /api/docs/content?sourceUrl=... — fetch one document's full content for preview.
import { json } from '@sveltejs/kit';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';
import { requireSession } from '@regno/auth';

export async function GET({ url, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const sourceUrl = url.searchParams.get('sourceUrl') ?? '';
  if (!sourceUrl) return json({ ok: false, error: 'sourceUrl is required' }, { status: 400 });

  const db = await getDb();
  const doc = await db.collection(Collections.CORTEX_INDEX).findOne(
    { sourceUrl },
    { projection: { title: 1, content: 1, domain: 1, sourceUrl: 1 } },
  );
  if (!doc) return json({ ok: false, error: 'Not found' }, { status: 404 });

  return json({
    ok: true,
    doc: {
      title: String(doc.title ?? doc.sourceUrl),
      content: String(doc.content ?? ''),
      domain: String(doc.domain ?? ''),
      sourceUrl: String(doc.sourceUrl ?? ''),
    },
  });
}
