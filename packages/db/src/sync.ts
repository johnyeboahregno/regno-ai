/**
 * Three-store sync — the pattern write flow documented in
 * docs/architecture/REGNO_AI_ARCHITECTURE_2026.html §3.3 and
 * docs/cortex/CORTEX_MIGRATION_GUIDE.md:
 *
 *   MongoDB (primary) ──► Qdrant (embedding) ──► Neo4j (graph node)
 *
 * MongoDB is the source of truth; Qdrant holds the embedding for semantic
 * search; Neo4j holds nodes + relationships for traversal. Sync is eventual,
 * completing within seconds of the primary write.
 */
import { ObjectId } from 'mongodb';
import { getDb } from './mongo.js';
import { getQdrant } from './qdrant.js';
import { run as neo4jRun } from './neo4j.js';
import { Collections, QdrantCollections } from '@regno/shared';

/** Embedding function — inject the provider-specific embedder (e.g. OpenAI text-embedding-3-small). */
export type EmbedFn = (text: string) => Promise<number[]>;

export interface PatternInput {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  confidence?: number;
  source?: string;
  [key: string]: unknown;
}

/**
 * Write a CORTEX pattern across all three stores.
 */
export async function writePattern(pattern: PatternInput, embed: EmbedFn): Promise<{ id: string }> {
  const db = await getDb();
  const now = new Date();
  const { id, name, description, tags = [], ...rest } = pattern;

  // 1. MongoDB — source of truth (upsert)
  await db.collection(Collections.CORTEX_PATTERNS).updateOne(
    { _id: id as unknown as ObjectId },
    { $set: { name, description, tags, ...rest, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );

  // 2. Qdrant — embedding for semantic search (best-effort)
  try {
    const vector = await embed(`${name}\n${description}`);
    const q = getQdrant();
    await q.upsert(QdrantCollections.CORTEX_PATTERNS, {
      wait: true,
      points: [
        { id, vector, payload: { name, description, tags, confidence: rest.confidence ?? null } },
      ],
    });
  } catch (e) {
    console.warn('[sync] qdrant write skipped:', (e as Error).message);
  }

  // 3. Neo4j — graph node + tag relationships (best-effort)
  try {
    await neo4jRun(
      `
    MERGE (p:Pattern {id: $id})
    SET p.name = $name, p.updatedAt = $now
    WITH p
    UNWIND coalesce($tags, []) AS tag
    MERGE (t:Tag {name: tag})
    MERGE (p)-[:TAGGED_WITH]->(t)
    `,
      { id, name, tags, now: now.toISOString() },
    );
  } catch (e) {
    console.warn('[sync] neo4j write skipped:', (e as Error).message);
  }

  return { id };
}

/**
 * Write an operational wisdom memory (compound over time) to Mongo + Qdrant.
 * Mirrors AgentMemoryService + WisdomSynthesizer from docs/cortex-flow-design.md.
 */
export async function writeWisdom(
  memory: { id: string; agentSlug: string; category: string; content: string; contexts?: string[]; developer?: string },
  embed: EmbedFn,
): Promise<{ id: string }> {
  const db = await getDb();
  const now = new Date();
  const { id, agentSlug, category, content, contexts = [], developer } = memory;

  await db.collection(Collections.CORTEX_AGENT_MEMORIES).updateOne(
    { _id: id as unknown as ObjectId },
    {
      $set: { agentSlug, category, content, contexts, developer, updatedAt: now },
      $setOnInsert: { createdAt: now, relevanceScore: 0 },
    },
    { upsert: true },
  );

  try {
    const vector = await embed(content);
    await getQdrant().upsert(QdrantCollections.CORTEX_WISDOM, {
      wait: true,
      points: [{ id, vector, payload: { agentSlug, category, content, contexts, developer } }],
    });
  } catch (e) {
    console.warn('[sync] wisdom qdrant write skipped:', (e as Error).message);
  }

  return { id };
}
