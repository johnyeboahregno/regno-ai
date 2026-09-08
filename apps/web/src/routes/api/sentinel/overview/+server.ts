// GET /api/sentinel/overview — SENTINEL observability rollup:
// cost/token spend (from ai_usage), execution latency/throughput (cortex_executions),
// and activity volume (sentinel_metrics).
import { json } from '@sveltejs/kit';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';

function pct(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export async function GET() {
  const db = await getDb();
  const execs = db.collection(Collections.CORTEX_EXECUTIONS);
  const usage = db.collection(Collections.AI_USAGE);
  const activity = db.collection(Collections.SENTINEL_METRICS);

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(dayStart.getTime() - 6 * 24 * 3600 * 1000);

  const [totalExecs, recent, agg, usageAgg, activityCount, todayCount, weekCount] = await Promise.all([
    execs.countDocuments(),
    execs.find({}, { projection: { durationMs: 1, llmCalls: 1, servedPhases: 1, finalScore: 1, agentSlug: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(500).toArray(),
    execs
      .aggregate([
        { $group: { _id: null, totalLlmCalls: { $sum: '$llmCalls' }, totalServed: { $sum: '$servedPhases' }, avgDuration: { $avg: '$durationMs' }, avgScore: { $avg: '$finalScore' } } },
      ])
      .toArray(),
    usage
      .aggregate([
        { $group: { _id: null, totalCost: { $sum: '$cost' }, totalTokens: { $sum: '$totalTokens' }, chatCalls: { $sum: { $cond: [{ $eq: ['$kind', 'chat'] }, 1, 0] } }, embedCalls: { $sum: { $cond: [{ $eq: ['$kind', 'embed'] }, 1, 0] } } } },
      ])
      .toArray(),
    activity.countDocuments(),
    execs.countDocuments({ createdAt: { $gte: dayStart } }),
    execs.countDocuments({ createdAt: { $gte: weekStart } }),
  ]);

  const durations = recent.map((r) => Number(r.durationMs ?? 0)).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  const a = agg[0] ?? { totalLlmCalls: 0, totalServed: 0, avgDuration: 0, avgScore: 0 };
  const u = usageAgg[0] ?? { totalCost: 0, totalTokens: 0, chatCalls: 0, embedCalls: 0 };

  return json({
    ok: true,
    executions: totalExecs,
    activity: activityCount,
    cost: {
      totalCostUsd: Number(u.totalCost ?? 0),
      totalTokens: Number(u.totalTokens ?? 0),
      chatCalls: Number(u.chatCalls ?? 0),
      embedCalls: Number(u.embedCalls ?? 0),
    },
    llm: {
      totalLlmCalls: Number(a.totalLlmCalls ?? 0),
      totalServedPhases: Number(a.totalServed ?? 0),
      avgScore: Number(a.avgScore ?? 0),
    },
    latency: {
      avgMs: Math.round(Number(a.avgDuration ?? 0)),
      p50Ms: Math.round(pct(durations, 50)),
      p95Ms: Math.round(pct(durations, 95)),
    },
    throughput: { today: todayCount, last7d: weekCount },
  });
}
