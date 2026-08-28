// GET /api/health — system + database + SMTP health for the Health page.
import { json } from '@sveltejs/kit';
import { getRedis, getDb, getQdrant, run as neo4jRun } from '@regno/db';

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

export async function GET() {
  const redis = await withTimeout(
    getRedis().ping().then(() => true).catch(() => false),
    5000,
    false,
  );
  const mongo = await withTimeout(
    (async () => {
      const db = await getDb();
      await db.command({ ping: 1 });
      return true;
    })().catch(() => false),
    6000,
    false,
  );
  const qdrant = await withTimeout(
    getQdrant().collectionExists('cortex_patterns').then((r) => r.exists).catch(() => false),
    5000,
    false,
  );
  const neo4j = await withTimeout(
    neo4jRun('RETURN 1 AS x').then(() => true).catch(() => false),
    5000,
    false,
  );

  const smtp = {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    from: process.env.SMTP_FROM_EMAIL ?? '',
    configured: Boolean(process.env.SMTP_HOST && process.env.SMTP_PASSWORD),
  };

  return json({ ok: true, service: 'regno-architect', redis, mongo, qdrant, neo4j, smtp });
}
