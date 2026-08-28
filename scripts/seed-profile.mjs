#!/usr/bin/env node
/**
 * Seed your personal conventions (profile/user-conventions.md) into the brain.
 * Stored as a profile memory so the regno-architect agent injects it as
 * `userMemories` on every run (see packages/flow/src/context.ts).
 *
 * Usage:  node scripts/seed-profile.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/regno';
const PROFILE_PATH = process.env.PROFILE_PATH ?? join(process.cwd(), 'profile', 'user-conventions.md');

async function main() {
  if (!existsSync(PROFILE_PATH)) {
    console.error('[seed-profile] profile/user-conventions.md not found');
    process.exit(1);
  }
  const content = readFileSync(PROFILE_PATH, 'utf8');
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  const db = mongo.db('regno');

  // Raw doc in cortex_index
  await db.collection('cortex_index').updateOne(
    { sourceUrl: 'profile://user-conventions' },
    { $set: { title: 'User Conventions', content, domain: 'profile', sourceUrl: 'profile://user-conventions', status: 'indexed', indexedAt: new Date() } },
    { upsert: true },
  );

  // Profile memory → injected as userMemories
  await db.collection('cortex_agent_memories').updateOne(
    { _id: 'profile-conventions' },
    { $set: { agentSlug: 'regno-architect', category: 'profile', content, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );

  await mongo.close();
  console.log('[seed-profile] done ✅ — conventions seeded as userMemories for regno-architect');
}

main().catch((err) => {
  console.error('[seed-profile] failed:', err.message);
  process.exit(1);
});
