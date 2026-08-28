/**
 * Knowledge ingestion pipeline — docs/knowledge/knowledge-system.md + §2.3 of DB_SCHEMA.
 *
 * Flow: source document → cortex_index (Mongo) → chunk/embed → doc_search (Qdrant, ask-the-docs RAG).
 * Entity/fact extraction into cortex_knowledge_facts + Neo4j is the LLM-driven step (Phase 2b).
 */
import { createHash } from 'node:crypto';
import { getDb, getQdrant } from '@regno/db';
import { Collections, QdrantCollections } from '@regno/shared';
import { embed } from '@regno/ai';

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 100;

export function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  if (text.length <= size) return text.length ? [text] : [];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));
    if (end >= text.length) break;
    start = end - overlap;
  }
  return chunks;
}

export interface SourceDocument {
  sourceUrl: string;
  title: string;
  content: string;
  domain: string;
}

/**
 * Ingest a single document: store raw in Mongo, chunk + embed into Qdrant doc_search.
 */
export async function ingestDocument(doc: SourceDocument): Promise<{ chunks: number }> {
  const db = await getDb();
  const q = getQdrant();
  const now = new Date();

  await db.collection(Collections.CORTEX_INDEX).updateOne(
    { sourceUrl: doc.sourceUrl },
    { $set: { ...doc, status: 'indexed', indexedAt: now, _factsExtracted: false } },
    { upsert: true },
  );

  const chunks = chunkText(doc.content);
  const digest = createHash('sha1').update(doc.sourceUrl).digest('hex').slice(0, 12);

  for (let i = 0; i < chunks.length; i++) {
    const vector = await embed(chunks[i]);
    await q.upsert(QdrantCollections.DOC_SEARCH, {
      wait: false,
      points: [
        {
          id: `${digest}-${i}`,
          vector,
          payload: {
            sourceUrl: doc.sourceUrl,
            title: doc.title,
            rel: doc.domain,
            heading: doc.title,
            version: 1,
            isLatest: true,
            chunk: i,
            text: chunks[i],
          },
        },
      ],
    });
  }
  return { chunks: chunks.length };
}

/** Store atomic facts (entity extraction + Neo4j sync is the LLM step in Phase 2b). */
export async function storeFacts(domain: string, facts: Array<{ content: string; confidence: number }>): Promise<void> {
  if (!facts.length) return;
  const db = await getDb();
  const now = new Date();
  await db.collection(Collections.CORTEX_KNOWLEDGE_FACTS).insertMany(
    facts.map((f) => ({ domain, content: f.content, confidence: f.confidence, createdAt: now })),
  );
}
