#!/usr/bin/env node
/**
 * Bootstrap the Regno Architect data layer:
 *   1. MongoDB indexes
 *   2. Qdrant collections (1536-dim, cosine — text-embedding-3-small)
 *   3. Neo4j constraints
 *   4. Redis ping
 *
 * Usage:  node scripts/init-db.mjs
 * (Requires the databases from `docker compose up -d mongo qdrant neo4j redis`.)
 */
import { MongoClient } from 'mongodb';
import { QdrantClient } from '@qdrant/js-client-rest';
import neo4j from 'neo4j-driver';
import Redis from 'ioredis';

const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/regno';
const DB_NAME = 'regno';
const QDRANT_URL = process.env.QDRANT_URL ?? 'http://localhost:6333';
const NEO4J_URI = process.env.NEO4J_URI ?? 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER ?? 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD ?? '';
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

const EMBED_DIM = 1536; // OpenAI text-embedding-3-small

async function initMongo() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const indexes = [
    ['users', [{ key: { email: 1 }, unique: true }]],
    ['cortex_agents', [{ key: { slug: 1 }, unique: true }]],
    ['cortex_patterns', [{ key: { name: 1 } }, { key: { tags: 1 } }]],
    ['cortex_agent_memories', [{ key: { agentSlug: 1, category: 1 } }, { key: { relevanceScore: -1 } }]],
    ['cortex_memories', [{ key: { taskId: 1 } }, { key: { agentSlug: 1 } }]],
    ['cortex_executions', [{ key: { taskId: 1 } }, { key: { agentSlug: 1, createdAt: -1 } }]],
    ['cortex_index', [{ key: { domain: 1 } }, { key: { sourceUrl: 1 } }]],
    ['cortex_knowledge_facts', [{ key: { domain: 1 } }, { key: { _relevanceScore: -1 } }]],
    ['cortex_entities', [{ key: { name: 1, domain: 1 } }]],
    ['knowledge_seed_status', [{ key: { url: 1 }, unique: true }]],
    ['credentials', [{ key: { name: 1 }, unique: true }]],
    ['pipeline_history', [{ key: { pipelineId: 1, createdAt: -1 } }]],
    ['audit', [{ key: { ts: -1 } }, { key: { actor: 1 } }]],
  ];
  for (const [coll, specs] of indexes) {
    await db.collection(coll).createIndexes(specs);
  }
  await client.close();
  console.log(`[init] Mongo indexes ok (${indexes.length} collections)`);
}

async function initQdrant() {
  const q = new QdrantClient({ url: QDRANT_URL });
  const names = ['cortex_patterns', 'cortex_wisdom', 'cortex_execution_memories', 'knowledge_vectors', 'doc_search'];
  for (const name of names) {
    const exists = await q.collectionExists(name);
    if (!exists.exists) {
      await q.createCollection(name, { vectors: { size: EMBED_DIM, distance: 'Cosine' } });
      console.log(`[init] Qdrant collection created: ${name}`);
    }
  }
  console.log('[init] Qdrant collections ok');
}

async function initNeo4j() {
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  const session = driver.session();
  try {
    await session.run('CREATE CONSTRAINT pattern_id IF NOT EXISTS FOR (p:Pattern) REQUIRE p.id IS UNIQUE');
    await session.run('CREATE CONSTRAINT tag_name IF NOT EXISTS FOR (t:Tag) REQUIRE t.name IS UNIQUE');
    await session.run('CREATE CONSTRAINT entity_name IF NOT EXISTS FOR (e:Entity) REQUIRE e.name IS UNIQUE');
  } finally {
    await session.close();
    await driver.close();
  }
  console.log('[init] Neo4j constraints ok');
}

async function initRedis() {
  const r = new Redis(REDIS_URL, { lazyConnect: false });
  await r.ping();
  r.disconnect();
  console.log('[init] Redis ok');
}

async function main() {
  console.log('[init] bootstrapping Regno Architect data layer…');
  await initMongo();
  await initQdrant();
  await initNeo4j();
  await initRedis();
  console.log('[init] done ✅');
}

main().catch((err) => {
  console.error('[init] failed:', err.message);
  process.exit(1);
});
