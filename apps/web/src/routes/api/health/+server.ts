// GET /api/health — system + database + SMTP health + AI usage/cost for the Health page.
import { json } from '@sveltejs/kit';
import { getRedis, getDb, getQdrant, run as neo4jRun } from '@regno/db';
import { Collections } from '@regno/shared';

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

  // Recall & Serve — served vs LLM calls across executions (best-effort).
  let served: unknown = null;
  try {
    const db = await getDb();
    const agg = await db
      .collection(Collections.CORTEX_EXECUTIONS)
      .aggregate([
        {
          $group: {
            _id: null,
            executions: { $sum: 1 },
            servedPhases: { $sum: '$servedPhases' },
            llmCalls: { $sum: '$llmCalls' },
          },
        },
      ])
      .toArray();
    const row = agg[0] ?? { executions: 0, servedPhases: 0, llmCalls: 0 };
    served = { executions: row.executions, servedPhases: row.servedPhases, llmCalls: row.llmCalls };
  } catch {
    served = null;
  }

  // AI usage & cost — aggregated from ai_usage (best-effort; null if collection absent).
  let usage: unknown = null;
  try {
    const db = await getDb();
    const usageColl = db.collection(Collections.AI_USAGE);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [totalRow, monthRow, byModelRows, byDayRows] = await Promise.all([
      usageColl
        .aggregate([
          {
            $group: {
              _id: null,
              calls: { $sum: 1 },
              inputTokens: { $sum: '$inputTokens' },
              outputTokens: { $sum: '$outputTokens' },
              totalTokens: { $sum: '$totalTokens' },
              cost: { $sum: '$cost' },
            },
          },
        ])
        .toArray(),
      usageColl
        .aggregate([
          { $match: { ts: { $gte: monthStart } } },
          {
            $group: {
              _id: null,
              calls: { $sum: 1 },
              totalTokens: { $sum: '$totalTokens' },
              cost: { $sum: '$cost' },
            },
          },
        ])
        .toArray(),
      usageColl
        .aggregate([
          {
            $group: {
              _id: { provider: '$provider', model: '$model' },
              calls: { $sum: 1 },
              inputTokens: { $sum: '$inputTokens' },
              outputTokens: { $sum: '$outputTokens' },
              totalTokens: { $sum: '$totalTokens' },
              cost: { $sum: '$cost' },
            },
          },
          { $sort: { cost: -1 } },
        ])
        .toArray(),
      usageColl
        .aggregate([
          {
            $group: {
              _id: '$day',
              calls: { $sum: 1 },
              totalTokens: { $sum: '$totalTokens' },
              cost: { $sum: '$cost' },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
    ]);

    const byDayMap = new Map<string, { calls: number; totalTokens: number; cost: number }>();
    for (const r of byDayRows) {
      byDayMap.set(String(r._id), { calls: r.calls, totalTokens: r.totalTokens, cost: r.cost });
    }

    // Continuous last-30-day series (oldest first) so the chart has no gaps.
    const byDay: Array<{ day: string; calls: number; totalTokens: number; cost: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      byDay.push({ day: key, ...(byDayMap.get(key) ?? { calls: 0, totalTokens: 0, cost: 0 }) });
    }

    usage = {
      totals: totalRow[0] ?? { calls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0 },
      month: monthRow[0] ?? { calls: 0, totalTokens: 0, cost: 0 },
      byDay,
      byModel: byModelRows.map((r) => ({
        provider: r._id.provider,
        model: r._id.model,
        calls: r.calls,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        totalTokens: r.totalTokens,
        cost: r.cost,
      })),
    };
  } catch {
    usage = null;
  }

  return json({ ok: true, service: 'regno-architect', redis, mongo, qdrant, neo4j, smtp, served, usage });
}
