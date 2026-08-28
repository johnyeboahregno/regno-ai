// GET /api/cortex/overview — counts for the CORTEX memory system dashboard.
import { json } from '@sveltejs/kit';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';

export async function GET() {
  const db = await getDb();
  const [patterns, memories, agents, executions, knowledge] = await Promise.all([
    db.collection(Collections.CORTEX_PATTERNS).countDocuments(),
    db.collection(Collections.CORTEX_AGENT_MEMORIES).countDocuments(),
    db.collection(Collections.CORTEX_AGENTS).countDocuments(),
    db.collection(Collections.CORTEX_EXECUTIONS).countDocuments(),
    db.collection(Collections.CORTEX_INDEX).countDocuments(),
  ]);
  return json({ ok: true, patterns, memories, agents, executions, knowledge });
}
