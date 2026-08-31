/**
 * Phase 7 — relevance scoring + Qdrant embedding (embedding-cosine engine).
 * One pass per fact: embed → cosine vs the seed/domain anchor → store the
 * vector in Qdrant `knowledge_vectors` (vector + score for the price of one
 * embed call) and stamp `_relevanceScore`/`_auditedAt`/`_embeddedAt`.
 *
 * Keyless mode: deterministic keyword score, no Qdrant write (no `_embeddedAt`
 * so a later run with a key picks them up).
 */
import type { Db } from 'mongodb';
import { Collections } from '@regno/shared';
import { getQdrant, ensureCollection } from '@regno/db';
import { cosine, embedSafe, keywordScore, EMBED_DIM } from './lib/llm.js';

const PARALLEL = 5;
const FACT_LIMIT = 5000;
const QDRANT_COLLECTION = 'knowledge_vectors';

export interface ScoreStats {
  scored: number;
  embedded: number;
}

export async function scoreAndEmbed(
  db: Db,
  domain: string,
  anchorText: string,
  onStage?: (msg: string) => void,
): Promise<ScoreStats> {
  const facts = await db
    .collection(Collections.CORTEX_KNOWLEDGE_FACTS)
    .find({ domain, _embeddedAt: { $exists: false } })
    .project({ factKey: 1, sourceUrl: 1, content: 1 })
    .limit(FACT_LIMIT)
    .toArray();

  if (!facts.length) return { scored: 0, embedded: 0 };

  // One shared anchor vector (seed description, or the domain itself).
  let anchor: number[] | null = null;
  try {
    anchor = await embedSafe((anchorText || domain).slice(0, 7000));
  } catch {
    anchor = null;
  }
  let qdrantReady = false;
  if (anchor) {
    await ensureCollection(QDRANT_COLLECTION, EMBED_DIM);
    qdrantReady = true;
  }

  const q = getQdrant();
  const stats: ScoreStats = { scored: 0, embedded: 0 };
  let done = 0;

  const queue = [...facts];
  const workers = Array.from({ length: Math.min(PARALLEL, Math.max(1, queue.length)) }, async () => {
    while (queue.length) {
      const fact = queue.shift()!;
      const content = String(fact.content ?? '');
      const key = String(fact.factKey ?? '');
      const vector = anchor ? await embedSafe(content.slice(0, 7000)) : null;
      const score = vector && anchor ? cosine(vector, anchor) : keywordScore(content, anchorText);
      const update: Record<string, unknown> = { _relevanceScore: Number(score.toFixed(4)), _auditedAt: new Date() };

      if (vector && qdrantReady) {
        const vectorId = `fact:${key}`;
        await q.upsert(QDRANT_COLLECTION, {
          wait: false,
          points: [
            {
              id: vectorId,
              vector,
              payload: {
                domain,
                sourceUrl: String(fact.sourceUrl ?? ''),
                text: content.slice(0, 800),
                factKey: key,
                _relevanceScore: Number(score.toFixed(4)),
                isKnowledgeFact: true,
              },
            },
          ],
        });
        update._embeddedAt = new Date();
        update.vectorId = vectorId;
        stats.embedded++;
      }

      await db.collection(Collections.CORTEX_KNOWLEDGE_FACTS).updateOne(
        { factKey: key },
        { $set: update },
      );
      stats.scored++;
      done++;
      onStage?.(`Scoring: ${done}/${facts.length} facts (score ${score.toFixed(2)})`);
    }
  });
  await Promise.all(workers);

  onStage?.(`Scoring done: ${stats.scored} scored · ${stats.embedded} embedded → Qdrant ${QDRANT_COLLECTION}`);
  return stats;
}

/**
 * Optional standalone embed fallback for facts that were scored by a
 * non-embedding engine. (Unused by default — embedding-cosine already embeds.)
 */
export async function embedRemaining(db: Db, domain: string, onStage?: (msg: string) => void): Promise<number> {
  const facts = await db
    .collection(Collections.CORTEX_KNOWLEDGE_FACTS)
    .find({ domain, _embeddedAt: { $exists: false } })
    .project({ factKey: 1, sourceUrl: 1, content: 1 })
    .limit(FACT_LIMIT)
    .toArray();
  await ensureCollection(QDRANT_COLLECTION, EMBED_DIM);
  const q = getQdrant();
  let embedded = 0;
  for (const fact of facts) {
    const content = String(fact.content ?? '');
    const vector = await embedSafe(content.slice(0, 7000));
    if (!vector) continue;
    await q.upsert(QDRANT_COLLECTION, {
      wait: false,
      points: [
        {
          id: `fact:${fact.factKey}`,
          vector,
          payload: { domain, sourceUrl: String(fact.sourceUrl ?? ''), text: content.slice(0, 800), factKey: fact.factKey, isKnowledgeFact: true },
        },
      ],
    });
    await db.collection(Collections.CORTEX_KNOWLEDGE_FACTS).updateOne(
      { factKey: fact.factKey },
      { $set: { _embeddedAt: new Date() } },
    );
    embedded++;
    onStage?.(`Embed: ${embedded}/${facts.length}`);
  }
  return embedded;
}
