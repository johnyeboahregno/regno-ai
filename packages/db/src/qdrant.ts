/**
 * Qdrant vector store client (semantic search / embeddings).
 * Collections: cortex_patterns, cortex_wisdom, knowledge_vectors, doc_search.
 */
import { QdrantClient } from '@qdrant/js-client-rest';

let client: QdrantClient | null = null;

export function getQdrant(): QdrantClient {
  if (!client) {
    client = new QdrantClient({
      url: process.env.QDRANT_URL ?? 'http://localhost:6333',
    });
  }
  return client;
}

/** Ensure a collection exists with the given vector size. Idempotent. */
export async function ensureCollection(
  name: string,
  vectorSize: number,
): Promise<void> {
  const q = getQdrant();
  const exists = await q.collectionExists(name);
  if (!exists.exists) {
    await q.createCollection(name, {
      vectors: { size: vectorSize, distance: 'Cosine' },
    });
  }
}

export async function closeQdrant(): Promise<void> {
  client = null;
}
