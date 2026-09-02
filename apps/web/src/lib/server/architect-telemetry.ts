/**
 * Architect → Mothership telemetry heartbeat.
 *
 * Each deployed Architect runs this in its web process. It probes local services,
 * encodes the snapshot as a Regno Standard document set (packages/shared), and
 * POSTs it to the Mothership's ingest endpoint:
 *
 *   POST {MOTHERSHIP_URL}/api/architects/{slug}/telemetry
 *
 * The Mothership (and local dev) has no MOTHERSHIP_URL / ARCHITECT_SLUG /
 * ARCHITECT_TELEMETRY_TOKEN, so this is a no-op there.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { totalmem, freemem } from 'node:os';
import { getDb, getRedis, getQdrant, run as neo4jRun } from '@regno/db';
import { buildArchitectTelemetryBundle, type ArchitectServiceState } from '@regno/shared';

const INTERVAL_MS = 30_000;
const REPORT_TIMEOUT_MS = 10_000;

let started = false;

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

let cachedVersion: string | null = null;
function version(): string {
  if (cachedVersion) return cachedVersion;
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { version?: string };
    cachedVersion = pkg.version ?? 'unknown';
  } catch {
    cachedVersion = process.env.REGNO_VERSION ?? 'unknown';
  }
  return cachedVersion;
}

async function probeServices(): Promise<ArchitectServiceState[]> {
  const [mongo, redis, qdrant, neo4j] = await Promise.all([
    withTimeout(
      (async () => {
        const db = await getDb();
        await db.command({ ping: 1 });
        return true;
      })().catch(() => false),
      3000,
      false,
    ),
    withTimeout(getRedis().ping().then((r) => r === 'PONG').catch(() => false), 3000, false),
    withTimeout(getQdrant().getCollections().then(() => true).catch(() => false), 3000, false),
    withTimeout(neo4jRun('RETURN 1 AS x').then(() => true).catch(() => false), 3000, false),
  ]);
  return [
    { name: 'mongo', online: mongo },
    { name: 'redis', online: redis },
    { name: 'qdrant', online: qdrant },
    { name: 'neo4j', online: neo4j },
  ];
}

async function reportOnce(url: string, slug: string, token: string): Promise<void> {
  try {
    const services = await probeServices();
    const allOnline = services.every((s) => s.online);
    const memPercent = totalmem() > 0 ? ((totalmem() - freemem()) / totalmem()) * 100 : 0;

    const bundle = buildArchitectTelemetryBundle({
      slug,
      domain: `${slug}.${(process.env.REGNO_ROOT_DOMAIN ?? 'regno.ai').replace(/^\.+/, '').replace(/\.+$/, '')}`,
      developer: '',
      version: version(),
      uptimeSeconds: Math.round(process.uptime()),
      memPercent: Math.round(memPercent * 10) / 10,
      services,
      status: allOnline ? 'healthy' : 'degraded',
    });

    const res = await fetch(`${url.replace(/\/+$/, '')}/api/architects/${slug}/telemetry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ configDocId: bundle.configDocId, docs: bundle.docs, summary: bundle.summary }),
      signal: AbortSignal.timeout(REPORT_TIMEOUT_MS),
    });
    if (!res.ok) console.warn(`[architect-telemetry] Mothership rejected heartbeat: ${res.status}`);
  } catch (err) {
    // Best-effort: never crash the Architect because the Mothership is unreachable.
    console.warn('[architect-telemetry] heartbeat failed:', (err as Error).message);
  }
}

/** Start the heartbeat loop (idempotent). No-op unless Architect telemetry is configured. */
export function startArchitectTelemetry(): void {
  if (started) return;
  started = true;

  const url = process.env.MOTHERSHIP_URL;
  const slug = process.env.ARCHITECT_SLUG;
  const token = process.env.ARCHITECT_TELEMETRY_TOKEN;
  if (!url || !slug || !token) return;

  void reportOnce(url, slug, token);
  const timer = setInterval(() => void reportOnce(url, slug, token), INTERVAL_MS);
  timer.unref?.();
}
