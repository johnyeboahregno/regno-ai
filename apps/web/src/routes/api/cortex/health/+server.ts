// GET /api/cortex/health — CORTEX memory-system dashboard data: knowledge-store
// counts, three-store + infra service status (Mongo/Qdrant/Neo4j/Redis/BullMQ),
// learning metrics, and patterns-by-domain. Mirrors the reference CORTEX Health tab.
import { json } from '@sveltejs/kit';
import { getDb, getQdrant, getRedis, run as neo4jRun } from '@regno/db';
import { Collections, QdrantCollections, Queues } from '@regno/shared';

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

export async function GET() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

  let db: Awaited<ReturnType<typeof getDb>> | null = null;
  try {
    db = await getDb();
  } catch {
    db = null;
  }

  // --- Knowledge store counts (best-effort per collection) ---
  const count = (coll: string) => (db ? db.collection(coll).countDocuments().catch(() => 0) : Promise.resolve(0));
  const [documents, facts, wisdom, memories, entities, patterns, evaluations, executions, staging, showcases] =
    await Promise.all([
      count(Collections.CORTEX_INDEX),
      count(Collections.CORTEX_KNOWLEDGE_FACTS),
      count(Collections.CORTEX_AGENT_MEMORIES),
      count(Collections.CORTEX_MEMORIES),
      count(Collections.CORTEX_ENTITIES),
      count(Collections.CORTEX_PATTERNS),
      count(Collections.MAESTRO_VALIDATIONS),
      count(Collections.CORTEX_EXECUTIONS),
      count(Collections.KNOWLEDGE_STAGING),
      count(Collections.SHOWCASES),
    ]);

  const knowledge = [
    { key: 'documents', glyph: '📄', label: 'Documents', value: documents },
    { key: 'facts', glyph: '◆', label: 'Facts', value: facts },
    { key: 'wisdom', glyph: '★', label: 'Wisdom', value: wisdom },
    { key: 'memories', glyph: '●', label: 'Memories', value: memories },
    { key: 'entities', glyph: '⬡', label: 'Entities', value: entities },
    { key: 'patterns', glyph: '◎', label: 'Patterns', value: patterns },
    { key: 'evaluations', glyph: '🍎', label: 'Evaluations', value: evaluations },
    { key: 'executions', glyph: '⚡', label: 'Executions', value: executions },
    { key: 'staging', glyph: '📋', label: 'Staging', value: staging },
    { key: 'showcases', glyph: '🎭', label: 'Showcases', value: showcases },
  ];
  const knowledgeTotal = knowledge.reduce((n, k) => n + k.value, 0);

  // --- Service status (independent probes run in parallel to bound latency) ---
  const mongoPing = db
    ? await withTimeout(db.command({ ping: 1 }).then(() => true).catch(() => false), 6000, false)
    : false;

  const [qdrantCount, neo4jNodes, redisPing] = await Promise.all([
    withTimeout(
      getQdrant()
        .count(QdrantCollections.CORTEX_PATTERNS)
        .then((r) => r.count)
        .catch(() => null as number | null),
      5000,
      null as number | null,
    ),
    withTimeout(
      neo4jRun('MATCH (p:Pattern) RETURN count(p) AS c')
        .then((rows) => {
          const r = rows as Array<{ c: number | { toNumber?: () => number } }>;
          const v = r[0]?.c;
          if (typeof v === 'number') return v;
          if (v && typeof v.toNumber === 'function') return v.toNumber();
          return 0;
        })
        .catch(() => null as number | null),
      5000,
      null as number | null,
    ),
    withTimeout(getRedis().ping().then(() => true).catch(() => false), 5000, false),
  ]);

  let bullmq = { active: 0, queued: 0 };
  if (redisPing) {
    try {
      const r = getRedis();
      let active = 0;
      let queued = 0;
      for (const q of Object.values(Queues)) {
        active += await r.llen(`bull:${q}:active`).catch(() => 0);
        queued += await r.llen(`bull:${q}:wait`).catch(() => 0);
        queued += await r.zcard(`bull:${q}:delayed`).catch(() => 0);
      }
      bullmq = { active, queued };
    } catch {
      /* redis unreachable — report empty */
    }
  }

  const qdrantSync =
    qdrantCount === null ? null : qdrantCount === patterns ? 'in-sync' : 'out-of-sync';

  const services = [
    { key: 'mongo', name: 'MongoDB', role: 'Primary Store', status: mongoPing ? 'online' : 'offline', detail: mongoPing ? `${patterns} patterns` : 'unreachable' },
    {
      key: 'qdrant',
      name: 'Qdrant',
      role: 'Vector Search',
      status: qdrantCount === null ? 'offline' : qdrantSync === 'in-sync' ? 'online' : 'degraded',
      detail: qdrantCount === null ? 'unavailable' : `${qdrantCount} vectors`,
      sync: qdrantSync,
    },
    { key: 'neo4j', name: 'Neo4j', role: 'Graph DB', status: neo4jNodes === null ? 'offline' : 'online', detail: neo4jNodes === null ? 'unavailable' : `${neo4jNodes} nodes` },
    {
      key: 'embedding',
      name: 'Embedding',
      role: 'LLM · Reasoning',
      status: qdrantCount === null ? 'offline' : 'online',
      detail: qdrantCount === null ? 'unavailable' : 'text-embedding-3-small',
    },
    { key: 'redis', name: 'Redis', role: 'Cache + Pub/Sub', status: redisPing ? 'online' : 'offline', detail: redisPing ? 'Connected' : 'unreachable' },
    { key: 'bullmq', name: 'BullMQ', role: 'Job Queue', status: 'idle', detail: `${bullmq.active} active · ${bullmq.queued} queued` },
  ];

  // --- Learning metrics ---
  const [created7d, used7d, totalSuccesses, totalFailures] = db
    ? await Promise.all([
        db.collection(Collections.CORTEX_PATTERNS).countDocuments({ createdAt: { $gte: weekAgo } }).catch(() => 0),
        db.collection(Collections.CORTEX_PATTERNS).countDocuments({ lastUsedAt: { $gte: weekAgo } }).catch(() => 0),
        db.collection(Collections.CORTEX_EXECUTIONS).countDocuments({ status: 'success' }).catch(() => 0),
        db.collection(Collections.CORTEX_EXECUTIONS).countDocuments({ status: { $in: ['failed', 'error'] } }).catch(() => 0),
      ])
    : [0, 0, 0, 0];

  // --- Pattern quality + patterns-by-domain (from Mongo patterns) ---
  const patternDocs = db
    ? await db.collection(Collections.CORTEX_PATTERNS).find({}).limit(2000).toArray().catch(() => [])
    : [];
  let active7d = 0;
  let highPerformers = 0;
  let lowConfidence = 0;
  const byDomain = new Map<string, { count: number; confSum: number; succ: number; fail: number }>();
  for (const p of patternDocs) {
    const updated = p.updatedAt instanceof Date ? p.updatedAt : new Date(p.updatedAt ?? 0);
    if (updated >= weekAgo) active7d += 1;
    const conf = typeof p.confidence === 'number' ? p.confidence : null;
    if (conf !== null && conf >= 0.8) highPerformers += 1;
    if (conf !== null && conf < 0.5) lowConfidence += 1;
    const domain = String(p.domain ?? (Array.isArray(p.tags) && p.tags[0] ? p.tags[0] : 'general'));
    const row = byDomain.get(domain) ?? { count: 0, confSum: 0, succ: 0, fail: 0 };
    row.count += 1;
    if (conf !== null) row.confSum += conf;
    row.succ += typeof p.successCount === 'number' ? p.successCount : 0;
    row.fail += typeof p.failureCount === 'number' ? p.failureCount : 0;
    byDomain.set(domain, row);
  }
  const patternsByDomain = [...byDomain.entries()]
    .map(([domain, r]) => ({
      domain,
      count: r.count,
      avgConfidence: r.count ? Number((r.confSum / r.count).toFixed(2)) : 0,
      successRate: r.succ + r.fail > 0 ? `${((r.succ / (r.succ + r.fail)) * 100).toFixed(1)}%` : 'N/A',
    }))
    .sort((a, b) => b.count - a.count);

  return json({
    ok: true,
    checkedAt: now.toISOString(),
    patterns: { total: patterns, active7d, highPerformers, lowConfidence },
    knowledge,
    knowledgeTotal,
    services,
    learning: { created7d, used7d, totalSuccesses, totalFailures },
    patternsByDomain,
  });
}
