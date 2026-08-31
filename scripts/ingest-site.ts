#!/usr/bin/env node
/**
 * Ingest a website into the CORTEX brain (CLI wrapper over @regno/ingest).
 *
 * Usage:
 *   npx tsx scripts/ingest-site.ts --url https://www.regnostandard.com [options]
 *
 * Options:
 *   --url <u>            Target site URL (required)
 *   --name <n>           Human label (defaults to domain)
 *   --domain <d>         Cortex domain key (defaults to host minus TLD)
 *   --description <d>    One-line description (relevance filter + scoring anchor)
 *   --max-pages <n>      Crawl cap (default 30)
 *   --depth <n>          Link-follow depth (default 2)
 *   --rate-limit-ms <n>  Polite delay between fetches (default 800)
 *   --phases <csv>       Subset: crawl,filter,process,index,facts,entities,score,expert,assets,finalize
 *   --seed-id <id>       Resume an existing seed (checkpoint/resume)
 *   --no-llm             Disable LLM phases (deterministic fallbacks)
 *   --no-assets          Skip asset download (GridFS)
 *
 * Requires Mongo + Qdrant up (npm run db:up). Best-effort LLM when OPENAI_API_KEY is set.
 */
import { parseArgs } from 'node:util';
import { runSeed, ALL_PHASES } from '@regno/ingest';
import type { PhaseName } from '@regno/ingest';

const { values } = parseArgs({
  options: {
    url: { type: 'string' },
    name: { type: 'string' },
    domain: { type: 'string' },
    description: { type: 'string' },
    'max-pages': { type: 'string' },
    depth: { type: 'string' },
    'rate-limit-ms': { type: 'string' },
    phases: { type: 'string' },
    'seed-id': { type: 'string' },
    'no-llm': { type: 'boolean', default: false },
    'no-assets': { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
});

if (values.help || !values.url) {
  console.log(`Ingest a website into the CORTEX brain.

Usage: npx tsx scripts/ingest-site.ts --url https://www.regnostandard.com [options]

Options:
  --url <u>            Target site URL (required)
  --name <n>           Human label (defaults to domain)
  --domain <d>         Cortex domain key
  --description <d>    One-line description (relevance filter + scoring anchor)
  --max-pages <n>      Crawl cap (default 30)
  --depth <n>          Link-follow depth (default 2)
  --rate-limit-ms <n>  Polite delay between fetches (default 800)
  --phases <csv>       Subset: ${ALL_PHASES.join(',')}
  --seed-id <id>       Resume an existing seed
  --no-llm             Disable LLM phases
  --no-assets          Skip asset download`);
  process.exit(values.help ? 0 : 1);
}

const phases = values.phases
  ? (values.phases.split(',').map((p) => p.trim()).filter((p): p is PhaseName => (ALL_PHASES as string[]).includes(p)))
  : undefined;

const input = {
  url: values.url,
  name: values.name,
  domain: values.domain,
  description: values.description,
  maxPages: values['max-pages'] ? Number(values['max-pages']) : undefined,
  depth: values.depth ? Number(values.depth) : undefined,
  rateLimitMs: values['rate-limit-ms'] ? Number(values['rate-limit-ms']) : undefined,
  phases: phases?.length ? phases : undefined,
  seedId: values['seed-id'],
  llm: !values['no-llm'],
  assets: !values['no-assets'],
};

let lastPct = -1;
const status = await runSeed(input, (p) => {
  const pct = Math.round(p.progress * 100);
  if (pct !== lastPct) {
    lastPct = pct;
    process.stdout.write(`\r[${String(pct).padStart(3)}%] ${p.phase.padEnd(9)} ${p.stage.padEnd(70)}`);
  }
});

process.stdout.write('\n');
console.log(`\n✅ seed ${status.seedId} · ${status.name} (${status.domain})`);
console.log(`   status: ${status.status}${status.grade ? ` · quality grade ${status.grade}` : ''}`);
console.log(`   docs: ${status.documentsIngested} · facts: ${status.facts} · entities: ${status.entities} · vectors: ${status.vectors} · assets: ${status.assets}`);
if (status.error) console.log(`   error: ${status.error}`);
console.log(`\nRecent log:`);
for (const line of (status.log ?? []).slice(-12)) console.log(`   · ${line}`);
