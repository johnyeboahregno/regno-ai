#!/usr/bin/env node
/**
 * Ingest your personal coding history into the CORTEX brain.
 *
 * For each repo in profile/repos.json (or $HISTORY_REPOS as comma-separated
 * paths), this ingests:
 *   - commit history (git log)  → cortex_index, domain `git/<repo>`
 *   - tracked code files        → cortex_index, domain `code/<repo>`
 *   - chunk/embed both          → Qdrant `doc_search` (if OPENAI_API_KEY set)
 *
 * Usage:
 *   node scripts/seed-history.mjs           # uses profile/repos.json
 *   HISTORY_REPOS=/a/repo,/b/repo node scripts/seed-history.mjs
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { createHash } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { QdrantClient } from '@qdrant/js-client-rest';

const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/regno';
const QDRANT_URL = process.env.QDRANT_URL ?? 'http://localhost:6333';
const EMBED_MODEL = 'text-embedding-3-small';
const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 100;
const MAX_FILE_BYTES = 200_000;
const MAX_COMMITS = 300;

function getRepos() {
  if (process.env.HISTORY_REPOS) {
    return process.env.HISTORY_REPOS.split(',').map((p) => p.trim()).filter(Boolean).map((path) => ({ path }));
  }
  const cfgPath = join(process.cwd(), 'profile', 'repos.json');
  if (!existsSync(cfgPath)) {
    throw new Error('profile/repos.json not found and HISTORY_REPOS not set');
  }
  const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
  return cfg.repos ?? [];
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

/** Qdrant point ids must be integers or UUIDs — derive a stable integer id. */
function pointId(sourceUrl, i) {
  const h = createHash('sha1').update(`${sourceUrl}#${i}`).digest('hex');
  return Number.parseInt(h.slice(0, 13), 16);
}

function gitLog(repo) {
  try {
    return execSync(
      `git -C "${repo}" log --pretty=format:"%h | %ad | %s" --date=short -n ${MAX_COMMITS}`,
      { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
    );
  } catch (e) {
    return null; // not a git repo or no history
  }
}

function gitLsFiles(repo) {
  try {
    return execSync(`git -C "${repo}" ls-files`, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  } catch (e) {
    return null;
  }
}

async function main() {
  const repos = getRepos();
  if (!repos.length) {
    console.error('[seed-history] no repos configured');
    process.exit(1);
  }

  const key = process.env.OPENAI_API_KEY ?? '';
  if (!key) console.warn('[seed-history] OPENAI_API_KEY not set — storing raw docs only (no embeddings)');

  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  const db = mongo.db('regno');
  const q = new QdrantClient({ url: QDRANT_URL });

  let totalDocs = 0;
  let totalChunks = 0;

  for (const { path } of repos) {
    if (!existsSync(path)) {
      console.warn(`[seed-history] skip (not found): ${path}`);
      continue;
    }
    const name = basename(path);
    console.log(`[seed-history] ingesting ${name}…`);

    // 1. Commit history
    const log = gitLog(path);
    if (log) {
      const sourceUrl = `git://${name}/log`;
      await db.collection('cortex_index').updateOne(
        { sourceUrl },
        { $set: { title: `${name} commit history`, content: log, domain: `git/${name}`, sourceUrl, status: 'indexed', developer: process.env.DEVELOPER ?? 'base', indexedAt: new Date() } },
        { upsert: true },
      );
      totalDocs++;
      if (key) {
        for (const [i, c] of chunk(log).entries()) {
          const vector = await embed(c, key);
          await q.upsert('doc_search', { wait: false, points: [{ id: pointId(sourceUrl, i), vector, payload: { sourceUrl, title: `${name} history`, rel: `git/${name}`, heading: 'history', version: 1, isLatest: true, chunk: i, text: c } }] });
          totalChunks++;
        }
      }
    }

    // 2. Tracked code files
    const files = gitLsFiles(path);
    if (!files) {
      console.warn(`[seed-history] ${name}: not a git repo — skipping file scan`);
      continue;
    }
    for (const rel of files) {
      const abs = join(path, rel);
      if (!existsSync(abs)) continue;
      const content = readFileSync(abs, 'utf8');
      if (content.length > MAX_FILE_BYTES) continue;
      const sourceUrl = `file://${abs.replaceAll('\\', '/')}`;
      const domain = `code/${name}`;
      await db.collection('cortex_index').updateOne(
        { sourceUrl },
        { $set: { title: `${name}/${rel}`, content, domain, sourceUrl, status: 'indexed', developer: process.env.DEVELOPER ?? 'base', indexedAt: new Date() } },
        { upsert: true },
      );
      totalDocs++;
      if (key) {
        for (const [i, c] of chunk(content).entries()) {
          const vector = await embed(c, key);
          await q.upsert('doc_search', { wait: false, points: [{ id: pointId(sourceUrl, i), vector, payload: { sourceUrl, title: `${name}/${rel}`, rel: domain, heading: rel, version: 1, isLatest: true, chunk: i, text: c } }] });
          totalChunks++;
        }
      }
    }
  }

  await mongo.close();
  console.log(`[seed-history] done ✅ — ${totalDocs} docs, ${totalChunks} chunks → cortex_index + doc_search`);
}

main().catch((err) => {
  console.error('[seed-history] failed:', err.message);
  process.exit(1);
});
