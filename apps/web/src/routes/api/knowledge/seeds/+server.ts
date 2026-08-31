// GET /api/knowledge/seeds — list knowledge seeds + their ingestion status.
import { json } from '@sveltejs/kit';
import { getDb } from '@regno/db';
import { listSeeds } from '@regno/ingest';

export async function GET() {
  const db = await getDb();
  const seeds = await listSeeds(db, 100);
  return json({ ok: true, count: seeds.length, seeds });
}
