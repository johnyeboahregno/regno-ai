// GET /api/cortex/overview — counts for the CORTEX memory system dashboard.
import { json } from '@sveltejs/kit';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';

export async function GET() {
  const db = await getDb();
  const [patterns, memories, agents, executions, knowledge, served] = await Promise.all([
    db.collection(Collections.CORTEX_PATTERNS).countDocuments(),
    db.collection(Collections.CORTEX_AGENT_MEMORIES).countDocuments(),
    db.collection(Collections.CORTEX_AGENTS).countDocuments(),
    db.collection(Collections.CORTEX_EXECUTIONS).countDocuments(),
    db.collection(Collections.CORTEX_INDEX).countDocuments(),
    (async () => {
      const agg = await db
        .collection(Collections.CORTEX_EXECUTIONS)
        .aggregate([
          { $group: { _id: null, servedPhases: { $sum: '$servedPhases' }, llmCalls: { $sum: '$llmCalls' } } },
        ])
        .toArray();
      return agg[0] ?? { servedPhases: 0, llmCalls: 0 };
    })(),
  ]);
  return json({ ok: true, patterns, memories, agents, executions, knowledge, served });
}
