/**
 * Phase 6 — entity extraction (Wave 2b).
 * Samples up to 5000 un-extracted facts, asks a cheap LLM for named entities,
 * upserts into `cortex_entities` (mentionCount increments) and MERGEs
 * `(:Entity)` nodes into Neo4j (best-effort). Un-sampled facts are bulk-marked
 * `_entityExtracted: true` after the sample completes. Keyless fallback uses a
 * capitalized-term regex.
 */
import type { Db } from 'mongodb';
import { Collections } from '@regno/shared';
import { run as neo4jRun } from '@regno/db';
import { chatSafe } from './lib/llm.js';

const SAMPLE_LIMIT = 5000;
const BATCH = 50;
const ENTITY_TYPES = ['person', 'team', 'circuit', 'event', 'organization', 'technology', 'location', 'concept'];
const STOP = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'from', 'into', 'when', 'what', 'how', 'why', 'http', 'https', 'www', 'com', 'org', 'regno', 'standard', 'document', 'data', 'time', 'also', 'will', 'can', 'use', 'using', 'used']);

interface RawEntity {
  name?: string;
  type?: string;
}

function parseEntities(raw: string | null): RawEntity[] | null {
  if (!raw) return null;
  const m = raw.match(/\[[\s\S]*\]/);
  if (!m) return null;
  try {
    const arr = JSON.parse(m[0]) as RawEntity[];
    if (!Array.isArray(arr)) return null;
    const out: RawEntity[] = [];
    for (const e of arr) {
      const name = e && typeof e.name === 'string' ? e.name.trim() : '';
      if (name.length > 1) out.push({ name, type: e.type ?? 'concept' });
    }
    return out;
  } catch {
    return null;
  }
}

/** Keyless fallback: capitalized multi-word runs, minus stop words. */
function regexEntities(text: string): RawEntity[] {
  const out = new Map<string, string>();
  const re = /\b([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,3})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const name = m[1].trim();
    const lower = name.toLowerCase();
    if (STOP.has(lower) || lower.length < 3) continue;
    out.set(name, 'concept');
  }
  return [...out.entries()].map(([name, type]) => ({ name, type }));
}

async function llmBatchEntities(facts: string[]): Promise<RawEntity[]> {
  const raw = await chatSafe(
    [
      { role: 'system', content: 'You extract named entities from knowledge facts. Return ONLY a JSON array like [{"name":"X","type":"technology"}].' },
      {
        role: 'user',
        content: `Extract named entities (people, organizations, technologies, locations, concepts, events). Types: ${ENTITY_TYPES.join(', ')}.\n\nFACTS:\n${facts.join('\n---\n')}`,
      },
    ],
    { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.1, maxTokens: 1500 },
  );
  return parseEntities(raw) ?? [];
}

export async function extractEntities(
  db: Db,
  domain: string,
  onStage?: (msg: string) => void,
): Promise<{ entities: number; factsProcessed: number }> {
  const factsColl = db.collection(Collections.CORTEX_KNOWLEDGE_FACTS);
  const entitiesColl = db.collection(Collections.CORTEX_ENTITIES);

  const facts = await factsColl
    .find({ domain, _entityExtracted: { $ne: true } })
    .project({ factKey: 1, content: 1 })
    .limit(SAMPLE_LIMIT)
    .toArray();

  const entitySet = new Map<string, string>();
  let processed = 0;
  const samples = facts.filter((f) => f._id !== undefined);

  for (let i = 0; i < samples.length; i += BATCH) {
    const batch = samples.slice(i, i + BATCH);
    const contents = batch.map((f) => String(f.content ?? ''));
    const useLlm = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
    const ents = useLlm ? await llmBatchEntities(contents) : regexEntities(contents.join(' '));
    for (const e of ents) {
      const name = e.name;
      if (!name) continue;
      if (!entitySet.has(name)) entitySet.set(name, e.type ?? 'concept');
    }
    await factsColl.updateMany(
      { factKey: { $in: batch.map((f) => f.factKey) } },
      { $set: { _entityExtracted: true, entities: ents.map((e) => e.name) } },
    );
    processed += batch.length;
    onStage?.(`Entities: ${processed}/${samples.length} facts sampled → ${entitySet.size} unique`);
  }

  // Bulk-mark any facts beyond the sample window so they don't re-run.
  if (samples.length) {
    await factsColl.updateMany(
      { domain, _entityExtracted: { $ne: true } },
      { $set: { _entityExtracted: true } },
    );
  }

  let total = 0;
  for (const [name, type] of entitySet) {
    const key = `${domain}|${name}`;
    await entitiesColl.updateOne(
      { key },
      {
        $set: { name, domain, type: ENTITY_TYPES.includes(type) ? type : 'concept', lastSeenAt: new Date() },
        $inc: { mentionCount: 1 },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );
    total++;
    // Neo4j graph node (best-effort — skipped when the graph DB is down).
    try {
      await neo4jRun(
        'MERGE (e:Entity {name: $name, domain: $domain}) ON CREATE SET e.type = $type RETURN e',
        { name, domain, type },
      );
    } catch {
      /* graph unavailable — Mongo still holds the entity */
    }
  }

  onStage?.(`Entities done: ${total} stored (+Neo4j best-effort)`);
  return { entities: total, factsProcessed: processed };
}
