#!/usr/bin/env node
/**
 * Seed the base coding standards (standards/*.md) into the brain:
 *   - Mongo `standards` collection (one doc per standard)
 *   - a `base-standards` memory (category 'base') in cortex_agent_memories
 * These are the immutable core injected into every run — the developer
 * "flavour" layer must never override them.
 *
 * Usage:  node scripts/seed-standards.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/regno';
const DIR = process.env.STANDARDS_DIR ?? 'standards';

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

async function main() {
  const files = walk(DIR).filter((f) => f.endsWith('.md'));
  if (!files.length) {
    console.error(`[seed-standards] no .md files found in ${DIR}`);
    process.exit(1);
  }

  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  const db = mongo.db('regno');

  for (const file of files) {
    const name = basename(file, '.md'); // coding, testing, tdd, ci-cd, go, rust, …
    const content = readFileSync(file, 'utf8');
    const sourceUrl = `standards://${name}`;
    await db.collection('standards').updateOne(
      { name },
      { $set: { name, content, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
    // Also index into cortex_index so standards show in the Docs menu.
    await db.collection('cortex_index').updateOne(
      { sourceUrl },
      {
        $set: { title: name, content, domain: 'standards', sourceUrl, status: 'indexed', developer: 'base', indexedAt: new Date() },
      },
      { upsert: true },
    );
  }

  // Compiled base-standards memory (injected as the immutable core).
  const all = files.map((f) => readFileSync(f, 'utf8')).join('\n\n---\n\n');
  await db.collection('cortex_agent_memories').updateOne(
    { _id: 'base-standards' },
    {
      $set: { agentSlug: 'regno-architect', category: 'base', content: all, updatedAt: new Date() },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true },
  );

  await mongo.close();
  console.log(`[seed-standards] ${files.length} standards → standards collection + base-standards memory`);
}

main().catch((err) => {
  console.error('[seed-standards] failed:', err.message);
  process.exit(1);
});
