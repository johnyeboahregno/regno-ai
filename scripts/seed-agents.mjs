#!/usr/bin/env node
/**
 * Seed cortex_agents with the two foundational agents:
 *   - general-assistant  (default-path-as-agent, full toolkit)
 *   - regno-architect    (your personal app builder)
 *
 * Agent shape mirrors docs/cortex-flow-design.md §1:
 *   declarative config → name, triggers, capabilities.tools, planTemplate of phases,
 *   plus governance WS10 model-card fields (costCeilingUsd, maxTokens, allowedDataPolicies).
 *
 * Usage:  node scripts/seed-agents.mjs
 */
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/regno';
const DB_NAME = 'regno';

const agents = [
  {
    slug: 'general-assistant',
    name: 'General Assistant',
    triggers: [],
    capabilities: {
      tools: ['read', 'grep', 'knowledgeBase', 'dataSourceQuery', 'pythonExec', 'webSearch', 'webFetch', 'emailSend'],
    },
    planTemplate: {
      depthStrategy: 'auto',
      phases: [
        { name: 'understand', needs: [] },
        { name: 'act', needs: [] },
        { name: 'verify', needs: [] },
      ],
    },
    costCeilingUsd: 10,
    maxTokens: 120000,
    allowedDataPolicies: [],
    regulatoryClass: 'standard',
    version: 1,
  },
  {
    slug: 'regno-architect',
    name: 'Regno Architect Me',
    triggers: ['build', 'scaffold', 'app', 'new project', 'implement', 'architect'],
    capabilities: {
      tools: ['read', 'grep', 'knowledgeBase', 'dataSourceQuery', 'pythonExec', 'fileWrite', 'bashExec', 'webSearch', 'emailSend'],
    },
    planTemplate: {
      depthStrategy: 'auto',
      phases: [
        { name: 'understand-remit', needs: ['knowledgeFacts', 'agentMemory'] },
        { name: 'survey-context', needs: ['priorDocuments', 'userMemories'] },
        { name: 'design', needs: [] },
        { name: 'implement', needs: [] },
        { name: 'verify', needs: [] },
        { name: 'learn', needs: [] },
      ],
    },
    costCeilingUsd: 20,
    maxTokens: 120000,
    allowedDataPolicies: ['personal-repos'],
    regulatoryClass: 'standard',
    version: 1,
  },
];

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const col = db.collection('cortex_agents');

  let count = 0;
  for (const a of agents) {
    const now = new Date();
    await col.updateOne(
      { slug: a.slug },
      { $set: { ...a, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
    count++;
  }
  await client.close();
  console.log(`[seed] ${count} agents seeded → ${agents.map((a) => a.slug).join(', ')}`);
}

main().catch((err) => {
  console.error('[seed] failed:', err.message);
  process.exit(1);
});
