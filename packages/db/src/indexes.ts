/**
 * MongoDB indexes — consolidated from docs/DB_SCHEMA.md and the live system.
 * Called by scripts/init-db.mjs at bootstrap.
 */
import { getDb } from './mongo.js';
import { Collections } from '@regno/shared';
import type { IndexDescription } from 'mongodb';

export async function ensureMongoIndexes(): Promise<void> {
  const db = await getDb();
  const specs: Array<{ collection: string; indexes: IndexDescription[] }> = [
    { collection: Collections.USERS, indexes: [{ key: { email: 1 }, unique: true }] },
    { collection: Collections.CORTEX_AGENTS, indexes: [{ key: { slug: 1 }, unique: true }] },
    { collection: Collections.CORTEX_PATTERNS, indexes: [{ key: { name: 1 } }, { key: { tags: 1 } }] },
    {
      collection: Collections.CORTEX_AGENT_MEMORIES,
      indexes: [{ key: { agentSlug: 1, category: 1 } }, { key: { relevanceScore: -1 } }],
    },
    { collection: Collections.CORTEX_MEMORIES, indexes: [{ key: { taskId: 1 } }, { key: { agentSlug: 1 } }] },
    { collection: Collections.CORTEX_EXECUTIONS, indexes: [{ key: { taskId: 1 } }, { key: { agentSlug: 1, createdAt: -1 } }] },
    { collection: Collections.CORTEX_INDEX, indexes: [{ key: { domain: 1 } }, { key: { sourceUrl: 1 } }] },
    { collection: Collections.CORTEX_KNOWLEDGE_FACTS, indexes: [{ key: { domain: 1 } }, { key: { _relevanceScore: -1 } }] },
    { collection: Collections.CORTEX_ENTITIES, indexes: [{ key: { name: 1, domain: 1 } }] },
    { collection: Collections.KNOWLEDGE_SEED_STATUS, indexes: [{ key: { url: 1 }, unique: true }] },
    { collection: Collections.CREDENTIALS, indexes: [{ key: { name: 1 }, unique: true }] },
    { collection: Collections.PIPELINE_HISTORY, indexes: [{ key: { pipelineId: 1, createdAt: -1 } }] },
    { collection: Collections.AUDIT, indexes: [{ key: { ts: -1 } }, { key: { actor: 1 } }] },
  ];

  for (const { collection, indexes } of specs) {
    await db.collection(collection).createIndexes(indexes);
  }
  console.log(`[init] Mongo indexes ensured (${specs.length} collections)`);
}
