#!/usr/bin/env node
/**
 * Seed the CORTEX brain from the local docs/ corpus.
 *   For every markdown doc: store raw in Mongo `cortex_index`,
 *   chunk + embed, then write vectors to Qdrant `doc_search` (ask-the-docs RAG).
 *
 * This is the "train and grow in the cortex brain" step — run it whenever the
 * corpus changes. Raw docs always land in Mongo `cortex_index`; embeddings go to
 * Qdrant `doc_search` only when OPENAI_API_KEY is set (best-effort).
 *
 * Usage:
 *   docker compose up -d mongo qdrant
 *   OPENAI_API_KEY=... node scripts/seed-brain.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { QdrantClient } from '@qdrant/js-client-rest';

const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/regno';
const QDRANT_URL = process.env.QDRANT_URL ?? 'http://localhost:6333';
const DOCS_DIR = process.env.DOCS_DIR ?? 'docs';
const EMBED_MODEL = 'text-embedding-3-small';
const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 100;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function chunk(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  if (text.length <= size) return text.length ? [text] : [];
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));
    if (end >= text.length) break;
    start = end - overlap;
  }
  return chunks;
}

async function embed(text, key) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  if (!res.ok) throw new Error(`embed error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data[0].embedding;
}

async function main() {
  const key = process.env.OPENAI_API_KEY ?? '';
  if (!key) {
    console.warn('[seed-brain] OPENAI_API_KEY not set — storing raw docs only (no embeddings).');
  }

  const files = walk(DOCS_DIR).filter((f) => /\.(md|html)$/i.test(f));
  console.log(`[seed-brain] found ${files.length} docs in ${DOCS_DIR}`);

  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  const db = mongo.db('regno');
  const q = new QdrantClient({ url: QDRANT_URL });

  let totalChunks = 0;
  for (let n = 0; n < files.length; n++) {
    const file = files[n];
    const content = readFileSync(file, 'utf8');
    const sourceUrl = 'file://' + file.replaceAll('\\', '/');
    const title = relative(DOCS_DIR, file).replaceAll('\\', '/');
    const domain = title.split('/')[0] ?? 'root';

    await db.collection('cortex_index').updateOne(
      { sourceUrl },
      { $set: { title, content, domain, sourceUrl, status: 'indexed', indexedAt: new Date(), _factsExtracted: false } },
      { upsert: true },
    );

    const chunks = chunk(content);
    const digest = createHash('sha1').update(sourceUrl).digest('hex').slice(0, 12);
    if (key) {
      for (let i = 0; i < chunks.length; i++) {
        const vector = await embed(chunks[i], key);
        await q.upsert('doc_search', {
          wait: false,
          points: [
            {
              id: `${digest}-${i}`,
              vector,
              payload: { sourceUrl, title, rel: domain, heading: title, version: 1, isLatest: true, chunk: i, text: chunks[i] },
            },
          ],
        });
        totalChunks++;
      }
    }
    if ((n + 1) % 25 === 0) console.log(`[seed-brain] ${n + 1}/${files.length} docs · ${totalChunks} chunks`);
  }

  await mongo.close();
  console.log(`[seed-brain] done ✅ — ${files.length} docs → cortex_index · ${totalChunks} chunks → doc_search`);
}

main().catch((err) => {
  console.error('[seed-brain] failed:', err.message);
  process.exit(1);
});
