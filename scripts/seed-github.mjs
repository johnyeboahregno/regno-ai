#!/usr/bin/env node
/**
 * Ingest every repo in a GitHub org into the CORTEX brain.
 *   - lists repos via the GitHub API (token required)
 *   - clones each (shallow) into .pull/github/<repo>
 *   - ingests git log + code files → cortex_index + doc_search
 *   - private repos are supported when GITHUB_TOKEN is set: the token authenticates the clone
 *     and is scrubbed from the clone's .git/config afterwards
 *
 * Env:
 *   GITHUB_TOKEN    (required — read:org; also authenticates private repo clones)
 *   GITHUB_ORG      (default regno-platform)
 *   GITHUB_REPOS    (explicit comma-separated owner/repo list — skips org listing)
 *   OPENAI_API_KEY  (for embeddings — omit to store raw docs only)
 *
 * Usage:  GITHUB_TOKEN=... node scripts/seed-github.mjs
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { QdrantClient } from '@qdrant/js-client-rest';

const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/regno';
const QDRANT_URL = process.env.QDRANT_URL ?? 'http://localhost:6333';
const ORG = process.env.GITHUB_ORG ?? 'regno-platform';
const TOKEN = process.env.GITHUB_TOKEN ?? '';
const CACHE = join(process.cwd(), '.pull', 'github');

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 100;
const MAX_FILE_BYTES = 200_000;
const MAX_COMMITS = 300;

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
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  if (!res.ok) throw new Error(`embed error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data[0].embedding;
}

async function listRepos() {
  const repos = [];
  let page = 1;
  while (true) {
    const res = await fetch(`https://api.github.com/orgs/${ORG}/repos?type=all&per_page=100&page=${page}`, {
      headers: { Authorization: `Bearer ${TOKEN}`, 'User-Agent': 'regno-seed', Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
    const batch = await res.json();
    if (!batch.length) break;
    for (const r of batch) repos.push({ name: r.name, clone_url: r.clone_url });
    if (batch.length < 100) break;
    page++;
  }
  return repos;
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (entry === '.git' || entry === 'node_modules') continue;
      walk(p, out);
    } else out.push(p);
  }
  return out;
}

function gitLog(dir) {
  try {
    return execSync(`git -C "${dir}" log --pretty=format:"%h | %ad | %s" --date=short -n ${MAX_COMMITS}`, {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

/**
 * Clone a repo (shallow) with optional auth for private repos.
 * With a token we embed it as an x-access-token credential just for the clone, then scrub
 * the remote URL so the token never persists in `.git/config` on disk.
 */
function cloneRepo(repo, dir, token) {
  const cleanUrl = repo.clone_url;
  if (!token) {
    execSync(`git clone --depth 1 "${cleanUrl}" "${dir}"`, { stdio: 'ignore', timeout: 300_000 });
    return;
  }
  const authed = cleanUrl.replace(/^https:\/\//, `https://x-access-token:${encodeURIComponent(token)}@`);
  execSync(`git clone --depth 1 "${authed}" "${dir}"`, { stdio: 'ignore', timeout: 300_000 });
  execSync(`git -C "${dir}" remote set-url origin "${cleanUrl}"`, { stdio: 'ignore' });
}

async function main() {
  let repos;
  if (process.env.GITHUB_REPOS) {
    repos = process.env.GITHUB_REPOS.split(',').map((r) => r.trim()).filter(Boolean).map((repo) => {
      const [owner, name] = repo.split('/');
      return { name: name || repo, clone_url: `https://github.com/${repo}.git` };
    });
    console.log(`[seed-github] ${repos.length} repos (explicit list)`);
  } else {
    if (!TOKEN) {
      console.error('[seed-github] GITHUB_TOKEN is not set (needed for org listing)');
      process.exit(1);
    }
    repos = await listRepos();
    console.log(`[seed-github] ${repos.length} repos in ${ORG}`);
  }

  const key = process.env.OPENAI_API_KEY ?? '';
  if (!key) console.warn('[seed-github] OPENAI_API_KEY not set — storing raw docs only (no embeddings)');

  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  const db = mongo.db('regno');
  const q = new QdrantClient({ url: QDRANT_URL });

  let totalDocs = 0;
  let totalChunks = 0;

  for (const repo of repos) {
    const dir = join(CACHE, repo.name);
    console.log(`[seed-github] ${repo.name}…`);
    if (!existsSync(join(dir, '.git'))) {
      mkdirSync(CACHE, { recursive: true });
      try {
        cloneRepo(repo, dir, TOKEN);
      } catch (e) {
        console.warn(`  skip (clone failed — private or no access?): ${repo.name}`);
        continue;
      }
    }

    // commit history
    const log = gitLog(dir);
    if (log) {
      const sourceUrl = `git://github/${ORG}/${repo.name}/log`;
      await db.collection('cortex_index').updateOne(
        { sourceUrl },
        { $set: { title: `${repo.name} commit history`, content: log, domain: `git/${ORG}`, sourceUrl, status: 'indexed', developer: process.env.DEVELOPER ?? 'base', indexedAt: new Date() } },
        { upsert: true },
      );
      totalDocs++;
      if (key) {
        const digest = createHash('sha1').update(sourceUrl).digest('hex').slice(0, 12);
        for (const [i, c] of chunk(log).entries()) {
          const vector = await embed(c, key);
          await q.upsert('doc_search', { wait: false, points: [{ id: `${digest}-${i}`, vector, payload: { sourceUrl, title: `${repo.name} history`, rel: `git/${ORG}`, heading: 'history', version: 1, isLatest: true, chunk: i, text: c } }] });
          totalChunks++;
        }
      }
    }

    // code files
    for (const abs of walk(dir)) {
      let content;
      try {
        content = readFileSync(abs, 'utf8');
      } catch {
        continue; // binary
      }
      if (content.length > MAX_FILE_BYTES) continue;
      const rel = abs.slice(dir.length + 1).replaceAll('\\', '/');
      const sourceUrl = `file://github/${ORG}/${repo.name}/${rel}`;
      const domain = `code/${ORG}/${repo.name}`;
      await db.collection('cortex_index').updateOne(
        { sourceUrl },
        { $set: { title: `${repo.name}/${rel}`, content, domain, sourceUrl, status: 'indexed', developer: process.env.DEVELOPER ?? 'base', indexedAt: new Date() } },
        { upsert: true },
      );
      totalDocs++;
      if (key) {
        const digest = createHash('sha1').update(sourceUrl).digest('hex').slice(0, 12);
        for (const [i, c] of chunk(content).entries()) {
          const vector = await embed(c, key);
          await q.upsert('doc_search', { wait: false, points: [{ id: `${digest}-${i}`, vector, payload: { sourceUrl, title: `${repo.name}/${rel}`, rel: domain, heading: rel, version: 1, isLatest: true, chunk: i, text: c } }] });
          totalChunks++;
        }
      }
    }
  }

  await mongo.close();
  console.log(`[seed-github] done ✅ — ${totalDocs} docs, ${totalChunks} chunks → cortex_index + doc_search`);
}

main().catch((err) => {
  console.error('[seed-github] failed:', err.message);
  process.exit(1);
});
