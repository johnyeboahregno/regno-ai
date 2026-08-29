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
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';

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
