// POST /api/stage/seed-data — seed the isolated `test_customers` collection
// with deterministic synthetic customer records (the E2E segmentation schema).
import { json } from '@sveltejs/kit';
import { getDb } from '@regno/db';
import { requireSession } from '@regno/auth';

const CITIES = ['New York', 'London', 'Berlin', 'Singapore', 'Toronto', 'Sydney', 'Tokyo', 'Amsterdam', 'Paris', 'Dubai'];
const FIRST = ['John', 'Jane', 'Ava', 'Liam', 'Noah', 'Emma', 'Olivia', 'Ethan', 'Mia', 'Lucas', 'Isla', 'Hugo'];
const LAST = ['Doe', 'Smith', 'Chen', 'Kumar', 'Ali', 'Novak', 'Rossi', 'Silva', 'Tanaka', 'Muller', 'Brown', 'Lee'];
const DAY = 86_400_000;

/** Deterministic PRNG so re-seeding with the same seed yields identical data. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function POST({ request, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { count?: number; seed?: number };
  const count = Math.min(Math.max(Math.floor(Number(body.count ?? 1000)) || 1000, 1), 100_000);
  const rnd = mulberry32(Math.floor(Number(body.seed ?? 42)) || 42);
  const now = Date.now();
  const seedId = `seed-${now}`;

  const ops = [];
  for (let i = 0; i < count; i++) {
    const doc = {
      customerId: `CUST${String(i + 1).padStart(4, '0')}`,
      name: `${FIRST[Math.floor(rnd() * FIRST.length)]} ${LAST[Math.floor(rnd() * LAST.length)]}`,
      email: `customer${i + 1}@example.com`,
      age: 18 + Math.floor(rnd() * 62),
      location: CITIES[Math.floor(rnd() * CITIES.length)],
      totalPurchases: Math.floor(rnd() * 40),
      totalSpent: Math.round((10 + rnd() * 1990) * 100) / 100,
      lastPurchaseDate: new Date(now - Math.floor(rnd() * 365) * DAY),
      registrationDate: new Date(now - (365 + Math.floor(rnd() * 730)) * DAY),
      segment: null,
      tags: [],
      metadata: { source: 'stage-seed', referrer: 'e2e' },
      seedId,
      createdAt: new Date(),
    };
    ops.push({ updateOne: { filter: { customerId: doc.customerId }, update: { $set: doc }, upsert: true } });
  }

  const db = await getDb();
  await db.collection('test_customers').bulkWrite(ops, { ordered: false });
  const total = await db.collection('test_customers').countDocuments();

  return json({ ok: true, count, total, seedId, collection: 'test_customers' });
}
