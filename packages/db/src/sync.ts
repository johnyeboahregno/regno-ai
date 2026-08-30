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
 *
 * Since 2026-08-30 (Recall & Serve): memories also carry `prompt`, `promptHash`,
 * `phase` and `score` so the decision layer can match future tasks against past
 * outcomes. When a memory with the same `promptHash` (+ agentSlug/developer)
 * already exists, it is REINFORCED (relevanceScore += 1, content refreshed)
 * instead of duplicated — so repeated successful runs strengthen a single memory.
 */
export interface WisdomMemory {
  id: string;
  agentSlug: string;
  category: string;
  content: string;
  contexts?: string[];
  developer?: string;
  prompt?: string;
  promptHash?: string;
  phase?: string;
  score?: number;
}

async function syncWisdomToQdrant(memory: WisdomMemory, embed: EmbedFn, id: string): Promise<void> {
  const { agentSlug, category, content, contexts = [], developer, prompt, phase, score } = memory;
  try {
    const vector = await embed(content);
    await getQdrant().upsert(QdrantCollections.CORTEX_WISDOM, {
      wait: true,
      points: [
        {
          id,
          vector,
          payload: { agentSlug, category, content, contexts, developer, prompt, phase, score },
        },
      ],
    });
  } catch (e) {
    console.warn('[sync] wisdom qdrant write skipped:', (e as Error).message);
  }
}

export async function writeWisdom(memory: WisdomMemory, embed: EmbedFn): Promise<{ id: string }> {
  const db = await getDb();
  const now = new Date();
  const { id, agentSlug, category, content, contexts = [], developer, prompt, promptHash, phase, score } = memory;

  // Dedupe + reinforce: same prompt (+ agent/developer) strengthens one memory.
  if (promptHash) {
    const filter: Record<string, unknown> = { promptHash, agentSlug };
    if (developer) filter.developer = developer;
    const existing = await db.collection(Collections.CORTEX_AGENT_MEMORIES).findOne(filter);
    if (existing) {
      await db.collection(Collections.CORTEX_AGENT_MEMORIES).updateOne(
        { _id: existing._id },
        {
          $set: { agentSlug, category, content, contexts, developer, prompt, phase, score, updatedAt: now },
          $inc: { relevanceScore: 1 },
        },
      );
      const existingId = String(existing._id);
      await syncWisdomToQdrant(memory, embed, existingId);
      return { id: existingId };
    }
  }

  await db.collection(Collections.CORTEX_AGENT_MEMORIES).updateOne(
    { _id: id as unknown as ObjectId },
    {
      $set: { agentSlug, category, content, contexts, developer, prompt, promptHash, phase, score, updatedAt: now },
      $setOnInsert: { createdAt: now, relevanceScore: 1 },
    },
    { upsert: true },
  );

  await syncWisdomToQdrant(memory, embed, id);
  return { id };
}

/**
 * Reinforcement — bump relevanceScore of the memory matching a promptHash.
 * Used by the orchestrator when a task is served from memory (repeated success).
 * Returns true when a memory was found and updated.
 */
export async function reinforceWisdom(promptHash: string, by = 1): Promise<boolean> {
  const db = await getDb();
  const res = await db.collection(Collections.CORTEX_AGENT_MEMORIES).updateOne(
    { promptHash },
    { $inc: { relevanceScore: by }, $set: { updatedAt: new Date() } },
  );
  return res.modifiedCount > 0;
}
