/**
 * Keyless keyword search over the own brain — the "zero-cost fallback engine"
 * from Zaeem's design (docs/architecture/REGNO_AI_ARCHITECTURE_2026.html §9:
 * `Keyword` — "TF-IDF keyword scoring with domain term matching. Zero-cost
 * fallback engine."; also docs/knowledge/knowledge-scoring.md hybrid dense+BM25).
 *
 * Runs against Mongo `cortex_index` because raw docs are ALWAYS stored there,
 * even when no embedding key was present at seed time (seed-brain.mjs stores
 * raw docs unconditionally). So a fork of Zaeem's build can search its own
 * ingested brain without an OpenAI key.
 */
import { getDb, getQdrant, run as neo4jRun } from '@regno/db';
import { Collections, QdrantCollections } from '@regno/shared';
import { embed } from '@regno/ai';

export interface KeywordHit {
  id: string;
  score: number; // 0..1 normalized TF-IDF
  title: string;
  sourceUrl: string;
  text: string;
  source: 'own';
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'with',
  'as', 'by', 'at', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'we', 'they', 'he',
  'she', 'them', 'their', 'his', 'her', 'our', 'your', 'not', 'no', 'so', 'if',
  'then', 'than', 'when', 'where', 'which', 'what', 'who', 'whom', 'how', 'why',
  'all', 'any', 'each', 'more', 'most', 'some', 'such', 'only', 'very', 'just',
  'about', 'into', 'over', 'under', 'again', 'further', 'once', 'here', 'there',
  'can', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'do', 'does',
  'did', 'has', 'have', 'had', 'also', 'too', 'per', 'via', 'vs', 'etc', 'fig',
]);

function tokenize(text: string): string[] {
  return (text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * TF-IDF keyword search over the ingested docs (Mongo `cortex_index`).
 * Returns the top `limit` hits scored 0..1, best first.
 */
export async function keywordSearch(query: string, limit = 8): Promise<KeywordHit[]> {
  const terms = tokenize(query);
  if (!terms.length) return [];

  const db = await getDb();
  const coll = db.collection(Collections.CORTEX_INDEX);

  // Candidate docs: must contain at least one query term (title or content).
  const anyTerm = new RegExp(terms.map(escapeRe).join('|'), 'i');
  const candidates = await coll
    .find({ $or: [{ title: anyTerm }, { content: anyTerm }] })
    .limit(500)
    .toArray();
  if (!candidates.length) return [];

  const N = candidates.length;
  const df = new Map<string, number>();
  const docTokens = candidates.map((doc) => {
    const toks = tokenize(`${doc.title ?? ''} ${doc.content ?? ''}`);
    for (const t of new Set(toks)) df.set(t, (df.get(t) ?? 0) + 1);
    return toks;
  });
  const idf = (t: string) => Math.log((N + 1) / (1 + (df.get(t) ?? 0))) + 1;

  const scored = candidates.map((doc, i) => {
    const tf = new Map<string, number>();
    for (const t of docTokens[i]) tf.set(t, (tf.get(t) ?? 0) + 1);
    let score = 0;
    for (const t of terms) {
      const f = tf.get(t) ?? 0;
      if (f > 0) score += (1 + Math.log(f)) * idf(t);
    }
    return { doc, score };
  });

  const ranked = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  if (!ranked.length) return [];

  const max = ranked[0].score || 1;
  return ranked.map(({ doc, score }) => ({
    id: String(doc._id),
    score: score / max,
    title: (doc.title as string) ?? 'Untitled',
    sourceUrl: (doc.sourceUrl as string) ?? '',
    text: ((doc.content as string) ?? '').slice(0, 300),
    source: 'own' as const,
  }));
}

export interface PatternHit {
  id: string;
  name: string;
  description: string;
  tags: string[];
  confidence: number | null;
  domain: string;
  score: number; // 0..1
}

/**
 * CortexBrain-style pattern retrieval — Mongo keyword (always available) plus
 * Qdrant semantic search (when OPENAI_API_KEY is set), merged and ranked.
 * Mirrors the reference CORTEX "intelligent pattern search" but is keyless-safe.
 */
export async function patternSearch(query: string, limit = 6): Promise<PatternHit[]> {
  const terms = tokenize(query);
  if (!terms.length) return [];

  const db = await getDb();
  const coll = db.collection(Collections.CORTEX_PATTERNS);
  const scored = new Map<string, PatternHit>();

  // 1. Mongo keyword over name/description/tags (always available).
  const anyTerm = new RegExp(terms.map(escapeRe).join('|'), 'i');
  const candidates = await coll
    .find({ $or: [{ name: anyTerm }, { description: anyTerm }, { tags: anyTerm }] })
    .limit(100)
    .toArray();
  for (const doc of candidates) {
    const name = String(doc.name ?? '');
    const description = String(doc.description ?? '');
    const tags = Array.isArray(doc.tags) ? doc.tags.map(String) : [];
    const hay = `${name} ${description} ${tags.join(' ')}`.toLowerCase();
    let score = 0;
    for (const t of terms) if (hay.includes(t)) score += 1;
    if (score > 0) {
      scored.set(String(doc._id), {
        id: String(doc._id),
        name,
        description,
        tags,
        confidence: typeof doc.confidence === 'number' ? doc.confidence : null,
        domain: String(doc.domain ?? tags[0] ?? 'general'),
        score: Math.min(1, score / Math.max(1, terms.length)),
      });
    }
  }

  // 2. Qdrant semantic search (only with an embedding key).
  if (process.env.OPENAI_API_KEY) {
    try {
      const vector = await embed(query);
      const res = await getQdrant().query(QdrantCollections.CORTEX_PATTERNS, {
        query: vector,
        limit,
        with_payload: true,
      });
      for (const p of res.points ?? []) {
        const payload = (p.payload ?? {}) as { name?: string; description?: string; tags?: string[]; confidence?: number };
        const id = String(p.id);
        const sim = Number(((p.score ?? 0) + 1) / 2); // cosine similarity → 0..1
        const existing = scored.get(id);
        if (existing) {
          existing.score = Math.max(existing.score, sim);
        } else {
          scored.set(id, {
            id,
            name: String(payload.name ?? id),
            description: String(payload.description ?? ''),
            tags: Array.isArray(payload.tags) ? payload.tags.map(String) : [],
            confidence: typeof payload.confidence === 'number' ? payload.confidence : null,
            domain: 'general',
            score: sim,
          });
        }
      }
    } catch {
      /* semantic unavailable — keyword results only */
    }
  }

  return [...scored.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

export interface GraphNode {
  id: string;
  name: string;
  tags: string[];
}

/**
 * Graph traversal over the pattern knowledge graph (Neo4j) — best-effort.
 * Returns pattern nodes reachable via TAGGED_WITH relationships whose name or
 * tag matches the query. Empty array when Neo4j is offline.
 */
export async function graphSearch(query: string, limit = 6): Promise<GraphNode[]> {
  const terms = tokenize(query);
  if (!terms.length) return [];
  try {
    const rows = (await neo4jRun(
      `
      MATCH (p:Pattern)-[:TAGGED_WITH]->(t:Tag)
      WHERE any(term IN $terms WHERE toLower(p.name) CONTAINS term OR toLower(t.name) CONTAINS term)
      RETURN p.id AS id, p.name AS name, collect(t.name) AS tags
      LIMIT $limit
      `,
      { terms, limit },
    )) as Array<{ id: string; name: string; tags: string[] }>;
    return rows.map((r) => ({ id: r.id, name: r.name ?? r.id, tags: r.tags ?? [] }));
  } catch {
    return [];
  }
}
