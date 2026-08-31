/**
 * Phase 5 — fact extraction (Wave 2a).
 * Sends each un-extracted page to a cheap LLM and stores 5–20 atomic facts in
 * `cortex_knowledge_facts`, keyed by factKey (idempotent upsert). Marks the page
 * `_factsExtracted: true` for resume. Keyless mode falls back to deterministic
 * sentence extraction so the pipeline still completes.
 */
import type { Db } from 'mongodb';
import { createHash } from 'node:crypto';
import { Collections } from '@regno/shared';
import { chatSafe } from './lib/llm.js';
import type { KnowledgeFact } from './types.js';

const PARALLEL = 10;
const PAGE_LIMIT = 500;

interface RawFact {
  content?: string;
  confidence?: number;
}

function factKey(domain: string, sourceUrl: string, content: string): string {
  return createHash('sha1').update(`${domain}|${sourceUrl}|${content}`).digest('hex').slice(0, 24);
}

function parseFacts(raw: string | null): RawFact[] | null {
  if (!raw) return null;
  const m = raw.match(/\[[\s\S]*\]/);
  if (!m) return null;
  try {
    const arr = JSON.parse(m[0]) as RawFact[];
    return Array.isArray(arr) ? arr.filter((f) => f && typeof f.content === 'string' && f.content.trim().length > 20) : null;
  } catch {
    return null;
  }
}

/** Keyless fallback: split content into sentences, take the meaty ones. */
function sentenceFacts(content: string): RawFact[] {
  const sents = content
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40 && s.length < 400);
  return sents.slice(0, 20).map((s) => ({ content: s, confidence: 0.5 }));
}

async function extractFactsForPage(
  db: Db,
  page: { _id?: unknown; sourceUrl: string; title?: string; content?: string; domain: string },
  domain: string,
  seedId: string,
): Promise<number> {
  const content = String(page.content ?? '').slice(0, 24000);
  let rawFacts: RawFact[] | null = null;

  if (content.trim()) {
    const prompt = `Extract 5-20 atomic, self-contained knowledge facts from the page below. Each fact must be a verifiable statement, independent of surrounding text.

Return ONLY a JSON array: [{"content":"fact text","confidence":0.0-1.0}]

Title: ${String(page.title ?? '')}
URL: ${page.sourceUrl}

PAGE CONTENT:
${content}`;
    const raw = await chatSafe(
      [
        { role: 'system', content: 'You extract strict JSON fact arrays from documents. No prose.' },
        { role: 'user', content: prompt },
      ],
      { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.2, maxTokens: 2000 },
    );
    rawFacts = parseFacts(raw);
  }

  const facts = rawFacts ?? sentenceFacts(content);
  const coll = db.collection(Collections.CORTEX_KNOWLEDGE_FACTS);
  let written = 0;

  for (const f of facts) {
    const fc = String(f.content).trim();
    if (!fc) continue;
    const key = factKey(domain, page.sourceUrl, fc);
    const doc: KnowledgeFact = {
      factKey: key,
      seedId,
      domain,
      sourceUrl: page.sourceUrl,
      content: fc,
      confidence: typeof f.confidence === 'number' ? f.confidence : 0.5,
      entities: [],
      _entityExtracted: false,
    };
    const res = await coll.updateOne(
      { factKey: key },
      { $setOnInsert: { ...doc, createdAt: new Date() } },
      { upsert: true },
    );
    if (res.upsertedCount) written++;
  }

  await db
    .collection(Collections.CORTEX_INDEX)
    .updateOne({ _id: page._id as never }, { $set: { _factsExtracted: true, factsExtractedAt: new Date() } });
  return written;
}

export async function extractFacts(
  db: Db,
  domain: string,
  seedId: string,
  onStage?: (msg: string) => void,
): Promise<{ written: number; pages: number }> {
  const pages = await db
    .collection(Collections.CORTEX_INDEX)
    .find({
      domain,
      _factsExtracted: { $ne: true },
      $or: [{ seedId }, { seedId: { $exists: false } }],
    })
    .project({ sourceUrl: 1, title: 1, content: 1, domain: 1 })
    .limit(PAGE_LIMIT)
    .toArray();

  let written = 0;
  let done = 0;
  const queue = [...pages];
  const workers = Array.from({ length: Math.min(PARALLEL, Math.max(1, queue.length)) }, async () => {
    while (queue.length) {
      const page = queue.shift()!;
      const n = await extractFactsForPage(db, page as never, domain, seedId);
      written += n;
      done++;
      onStage?.(`Facts: ${done}/${pages.length} pages → ${written} facts`);
    }
  });
  await Promise.all(workers);
  return { written, pages: pages.length };
}
