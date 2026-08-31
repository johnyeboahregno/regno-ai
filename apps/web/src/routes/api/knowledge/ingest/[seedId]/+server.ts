// GET /api/knowledge/ingest/[seedId] — live status of a knowledge seed run.
import { json } from '@sveltejs/kit';
import { getDb } from '@regno/db';
import { getStatus } from '@regno/ingest';

export async function GET({ params }) {
  const db = await getDb();
  const status = await getStatus(db, params.seedId);
  if (!status) return json({ ok: false, error: 'seed not found' }, { status: 404 });
  return json({ ok: true, status });
}
