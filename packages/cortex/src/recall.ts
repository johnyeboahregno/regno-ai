/**
 * Recall & Serve — the decision layer that lets the CORTEX brain answer from memory.
 *
 * `recallBest()` searches the agent's learned wisdom (`cortex_wisdom` Qdrant +
 * `cortex_agent_memories` Mongo) and, as a fallback, patterns (`cortex_patterns`)
 * for the best match to a new task/phase prompt. `shouldServe()` decides whether
 * that match is confident enough to serve WITHOUT an LLM call.
 *
 * Design: docs/architecture/RECALL_SERVE_DECISION_LAYER.md
 * - Semantic path: Qdrant cosine over `cortex_wisdom` (only when OPENAI_API_KEY set).
 * - Zero-cost path: TF-IDF-ish keyword over Mongo `cortex_agent_memories` (always).
 * - Developer isolation: an expected developer is never served another's flavour.
 * - Exact repeat: when a candidate's `promptHash` matches the incoming prompt hash,
 *   it is served immediately (an exact repeated task needs no re-reasoning).
 */
import { getDb, getQdrant } from '@regno/db';
import { Collections, QdrantCollections } from '@regno/shared';
import { embed } from '@regno/ai';
import { patternSearch } from './search.js';

export interface ServedCandidate {
  id: string;
  category: string; // 'insight' | 'pattern' | ...
  content: string; // the stored answer content
  score: number; // 0..1 similarity / relevance (merged semantic + keyword)
  /** Original execution quality score (0..100) of the stored memory, when known. */
  storedScore?: number;
  ageDays: number; // age of the memory in days
  developer?: string;
  agentSlug?: string;
  phase?: string;
  promptHash?: string;
  relevanceScore?: number; // reinforcement count (0 when unknown)
}

export interface RecallOptions {
  limit?: number;
  developer?: string;
  agentSlug?: string;
  categories?: string[];
  minScore?: number;
  maxAgeDays?: number;
  /** When set, a candidate with this exact promptHash is treated as a strong match. */
  exactPromptHash?: string;
}

export interface ServeDecision {
  served: boolean;
  candidate?: ServedCandidate;
  reason: string; // machine-readable: 'no-match' | 'exact-repeat' | 'served' | 'low-score:..' | 'stale:..' | 'category:..' | 'developer-mismatch'
}

/** Conservative defaults — only near-repeat, fresh, own-flavour matches get served. */
export const DEFAULT_MIN_SCORE = 0.86;
export const DEFAULT_MAX_AGE_DAYS = 180;
const SERVABLE_CATEGORIES = new Set(['insight', 'pattern']);

function escapeRe(t: string): string {
  return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tokenize(text: string): string[] {
  return (text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length > 2);
}

function toAgeDays(date: Date | string | undefined): number {
  if (!date) return Infinity;
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return Infinity;
  return (Date.now() - t) / 86_400_000;
}

/**
 * Best matches from memory for a query, merged (semantic + keyword) and ranked.
 * Metadata (age, reinforcement, developer, promptHash) is backfilled from Mongo
 * so both retrieval paths are consistent.
 */
export async function recallBest(query: string, opts: RecallOptions = {}): Promise<ServedCandidate[]> {
  const limit = Math.max(1, opts.limit ?? 5);
  const db = await getDb();
  const coll = db.collection(Collections.CORTEX_AGENT_MEMORIES);
  const out = new Map<string, ServedCandidate>();

  // 1. Semantic over cortex_wisdom (Qdrant) — only with an embedding key.
  if (process.env.OPENAI_API_KEY) {
    try {
      const vector = await embed(query);
      const res = await getQdrant().query(QdrantCollections.CORTEX_WISDOM, {
        query: vector,
        limit: limit * 4,
        with_payload: true,
      });
      for (const p of res.points ?? []) {
        const payload = (p.payload ?? {}) as Record<string, unknown>;
        const id = String(p.id);
        const content = String(payload.content ?? '');
        if (!content) continue;
        const sim = Number(((p.score ?? 0) + 1) / 2); // cosine → 0..1
        out.set(id, {
          id,
          category: String(payload.category ?? 'insight'),
          content,
          score: sim,
          storedScore: typeof payload.score === 'number' ? payload.score : undefined,
          ageDays: 0, // backfilled below
          developer: payload.developer as string | undefined,
          agentSlug: payload.agentSlug as string | undefined,
          phase: payload.phase as string | undefined,
          promptHash: payload.promptHash as string | undefined,
        });
      }
    } catch {
      /* semantic unavailable — keyword only */
    }
  }

  // 2. Zero-cost keyword over Mongo cortex_agent_memories (always available).
  const terms = tokenize(query);
  if (terms.length) {
    const anyTerm = new RegExp(terms.map(escapeRe).join('|'), 'i');
    const cands = await coll
      .find({ $or: [{ content: anyTerm }, { prompt: anyTerm }] })
      .limit(200)
      .toArray();
    for (const doc of cands) {
      const id = String(doc._id);
      const content = String(doc.content ?? '');
      if (!content) continue;
      const hay = `${String(doc.prompt ?? '')} ${content}`.toLowerCase();
      let hits = 0;
      for (const t of terms) if (hay.includes(t)) hits++;
      if (hits === 0) continue;
      const kwScore = Math.min(1, hits / Math.max(1, terms.length));
      const existing = out.get(id);
      const cand: ServedCandidate = {
        id,
        category: String(doc.category ?? 'insight'),
        content,
        score: kwScore,
        storedScore: typeof doc.score === 'number' ? doc.score : undefined,
        ageDays: toAgeDays(doc.createdAt as Date | string | undefined),
        developer: doc.developer as string | undefined,
        agentSlug: doc.agentSlug as string | undefined,
        phase: doc.phase as string | undefined,
        promptHash: doc.promptHash as string | undefined,
        relevanceScore: typeof doc.relevanceScore === 'number' ? doc.relevanceScore : 0,
      };
      if (existing) {
        existing.score = Math.max(existing.score, kwScore);
        existing.ageDays = cand.ageDays;
        if (cand.relevanceScore) existing.relevanceScore = cand.relevanceScore;
      } else {
        out.set(id, cand);
      }
    }
  }

  // 3. Pattern fallback — when no wisdom matched, a strongly matching pattern can serve.
  if (out.size === 0) {
    try {
      const pats = await patternSearch(query, 1);
      const top = pats[0];
      if (top && top.score >= (opts.minScore ?? DEFAULT_MIN_SCORE)) {
        out.set(top.id, {
          id: top.id,
          category: 'pattern',
          content: `${top.name}:\n${top.description}`,
          score: top.score,
          ageDays: 0,
        });
      }
    } catch {
      /* patterns unavailable */
    }
  }

  // 4. Backfill metadata from Mongo for the strongest candidates.
  const ids = [...out.keys()].slice(0, limit * 4);
  if (ids.length) {
    const docs = await coll.find({ _id: { $in: ids.map((id) => id as never) } }).toArray();
    for (const doc of docs) {
      const id = String(doc._id);
      const cand = out.get(id);
      if (!cand) continue;
      cand.ageDays = toAgeDays(doc.createdAt as Date | string | undefined);
      if (typeof doc.relevanceScore === 'number') cand.relevanceScore = doc.relevanceScore;
      if (typeof doc.score === 'number') cand.storedScore = doc.score;
      if (doc.developer) cand.developer = doc.developer as string;
      if (doc.agentSlug) cand.agentSlug = doc.agentSlug as string;
      if (doc.promptHash) cand.promptHash = doc.promptHash as string;
    }
  }

  // 5. Filter + rank.
  let results = [...out.values()];
  if (opts.developer) results = results.filter((c) => !c.developer || c.developer === opts.developer);
  if (opts.agentSlug) results = results.filter((c) => !c.agentSlug || c.agentSlug === opts.agentSlug);
  if (opts.categories) results = results.filter((c) => opts.categories!.includes(c.category));

  // Exact prompt repeat outranks everything.
  results.sort((a, b) => {
    const ae = opts.exactPromptHash && a.promptHash === opts.exactPromptHash ? 1 : 0;
    const be = opts.exactPromptHash && b.promptHash === opts.exactPromptHash ? 1 : 0;
    if (ae !== be) return be - ae;
    return b.score - a.score;
  });

  return results.slice(0, limit);
}

/**
 * Decision gate — should this candidate be served WITHOUT an LLM call?
 * Conservative by default: fresh, high-confidence, own-flavour matches only.
 */
export function shouldServe(candidate: ServedCandidate | undefined, opts: RecallOptions = {}): ServeDecision {
  if (!candidate) return { served: false, reason: 'no-match' };

  const minScore = opts.minScore ?? DEFAULT_MIN_SCORE;
  const maxAge = opts.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS;

  // Exact repeat of a stored prompt — serve regardless of age/score.
  if (opts.exactPromptHash && candidate.promptHash === opts.exactPromptHash) {
    return { served: true, candidate, reason: 'exact-repeat' };
  }

  if (candidate.score < minScore) return { served: false, reason: `low-score:${candidate.score.toFixed(3)}` };
  if (candidate.ageDays > maxAge) return { served: false, reason: `stale:${Math.round(candidate.ageDays)}d` };
  if (!SERVABLE_CATEGORIES.has(candidate.category)) return { served: false, reason: `category:${candidate.category}` };
  if (opts.developer && candidate.developer && candidate.developer !== opts.developer) {
    return { served: false, reason: 'developer-mismatch' };
  }

  return { served: true, candidate, reason: 'served' };
}
