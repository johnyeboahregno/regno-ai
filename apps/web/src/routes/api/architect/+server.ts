// GET /api/architect — the Architect's "age & intelligence" gimmick.
//
// Human years  = real wall-clock time since the earliest recorded activity (bornAt).
// AI years     = human years × multiplier, where multiplier = 60 (AI baseline aging rate)
//                plus a log-scaled "learning" bonus derived from the knowledge stores.
// Everything is best-effort: if Mongo is down or empty the endpoint still answers with zeros.
import { json } from '@sveltejs/kit';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';

const MS_PER_DAY = 86_400_000;
const DAYS_PER_YEAR = 365.25;

// Baseline AI aging rate — an AI "ages" 60× faster than a human (dog years, but for machines).
const BASE_RATE = 60;
const MAX_RATE = 400;

export async function GET() {
  let db: Awaited<ReturnType<typeof getDb>> | null = null;
  try {
    db = await getDb();
  } catch {
    db = null;
  }

  // --- Knowledge-store counts (best-effort per collection) -------------------------------
  const count = (coll: string): Promise<number> =>
    db ? db.collection(coll).countDocuments().catch(() => 0) : Promise.resolve(0);

  const [documents, facts, wisdom, memories, entities, patterns, evaluations, executions, showcases, agents] =
    await Promise.all([
      count(Collections.CORTEX_INDEX),
      count(Collections.CORTEX_KNOWLEDGE_FACTS),
      count(Collections.CORTEX_AGENT_MEMORIES),
      count(Collections.CORTEX_MEMORIES),
      count(Collections.CORTEX_ENTITIES),
      count(Collections.CORTEX_PATTERNS),
      count(Collections.MAESTRO_VALIDATIONS),
      count(Collections.CORTEX_EXECUTIONS),
      count(Collections.SHOWCASES),
      count(Collections.AGENTS),
    ]);

  // --- bornAt: earliest recorded activity across timestamped collections ------------------
  const minDate = (coll: string, field = 'createdAt'): Promise<Date | null> => {
    if (!db) return Promise.resolve(null);
    return db
      .collection(coll)
      .aggregate([{ $group: { _id: null, min: { $min: `$${field}` } } }])
      .toArray()
      .then((rows) => {
        const v = rows[0]?.min;
        if (v instanceof Date) return v;
        if (v) return new Date(v as string | number);
        return null;
      })
      .catch(() => null);
  };

  const stamps = await Promise.all([
    minDate(Collections.CORTEX_EXECUTIONS),
    minDate(Collections.CORTEX_PATTERNS),
    minDate(Collections.CORTEX_MEMORIES),
    minDate(Collections.CORTEX_AGENT_MEMORIES),
    minDate(Collections.CORTEX_INDEX),
    minDate(Collections.AI_USAGE, 'ts'),
  ]);

  const valid = stamps.filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()));
  const bornAt = valid.length ? new Date(Math.min(...valid.map((d) => d.getTime()))) : null;

  // --- AI usage (tokens / calls / cost) ----------------------------------------------------
  let usage: {
    totals: { calls: number; inputTokens: number; outputTokens: number; totalTokens: number; cost: number };
    byDay: Array<{ day: string; calls: number; totalTokens: number; cost: number }>;
    byModel: Array<{ provider: string; model: string; calls: number; totalTokens: number; cost: number }>;
  } | null = null;

  try {
    if (db) {
      const usageColl = db.collection(Collections.AI_USAGE);
      const [totalRow, byModelRows, byDayRows] = await Promise.all([
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
            {
              $group: {
                _id: { provider: '$provider', model: '$model' },
                calls: { $sum: 1 },
                totalTokens: { $sum: '$totalTokens' },
                cost: { $sum: '$cost' },
              },
            },
            { $sort: { totalTokens: -1 } },
            { $limit: 5 },
          ])
          .toArray(),
        usageColl
          .aggregate([
            { $group: { _id: '$day', calls: { $sum: 1 }, totalTokens: { $sum: '$totalTokens' }, cost: { $sum: '$cost' } } },
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

      const totalsRow = totalRow[0] as unknown as
        | { calls: number; inputTokens: number; outputTokens: number; totalTokens: number; cost: number }
        | undefined;

      usage = {
        totals: totalsRow ?? { calls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0 },
        byDay,
        byModel: byModelRows.map((r) => ({
          provider: r._id.provider,
          model: r._id.model,
          calls: r.calls,
          totalTokens: r.totalTokens,
          cost: r.cost,
        })),
      };
    }
  } catch {
    usage = null;
  }

  // --- The age math ------------------------------------------------------------------------
  const now = new Date();
  const humanDays = bornAt ? Math.max(0, (now.getTime() - bornAt.getTime()) / MS_PER_DAY) : 0;
  const humanYears = humanDays / DAYS_PER_YEAR;

  const totalTokens = usage?.totals?.totalTokens ?? 0;
  const memoriesTotal = memories + facts + wisdom;

  const factors = [
    { key: 'documents', label: 'Knowledge documents', value: documents, weight: 2 },
    { key: 'patterns', label: 'Learned patterns', value: patterns, weight: 1.5 },
    { key: 'memories', label: 'Memories (facts + wisdom)', value: memoriesTotal, weight: 1.2 },
    { key: 'executions', label: 'Executions run', value: executions, weight: 1.0 },
    { key: 'tokens', label: 'Tokens processed', value: totalTokens, weight: 0.05 },
  ].map((f) => ({ ...f, contribution: f.weight * Math.log(1 + f.value) }));

  const intelligenceScore = factors.reduce((n, f) => n + f.contribution, 0);
  const multiplier = Math.min(MAX_RATE, Math.max(BASE_RATE, BASE_RATE + intelligenceScore));
  const aiYears = humanYears * multiplier;

  const knowledge = [
    { key: 'documents', glyph: '📄', label: 'Documents', value: documents },
    { key: 'facts', glyph: '◆', label: 'Facts', value: facts },
    { key: 'wisdom', glyph: '★', label: 'Wisdom', value: wisdom },
    { key: 'memories', glyph: '●', label: 'Memories', value: memories },
    { key: 'entities', glyph: '⬡', label: 'Entities', value: entities },
    { key: 'patterns', glyph: '◎', label: 'Patterns', value: patterns },
    { key: 'evaluations', glyph: '🍎', label: 'Evaluations', value: evaluations },
    { key: 'executions', glyph: '⚡', label: 'Executions', value: executions },
    { key: 'agents', glyph: '👤', label: 'SMAs', value: agents },
    { key: 'showcases', glyph: '🎭', label: 'Showcases', value: showcases },
  ];

  return json({
    ok: true,
    bornAt: bornAt ? bornAt.toISOString() : null,
    humanDays: Math.floor(humanDays),
    humanYears: Number(humanYears.toFixed(2)),
    aiYears: Number(aiYears.toFixed(1)),
    multiplier: Number(multiplier.toFixed(1)),
    intelligenceScore: Number(intelligenceScore.toFixed(2)),
    factors,
    knowledge,
    usage,
  });
}
