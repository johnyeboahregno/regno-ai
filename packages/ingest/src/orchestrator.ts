/**
 * KnowledgeSeedWorker — the ingestion orchestrator.
 *
 * Runs the documented 10-phase pipeline with checkpoint/resume:
 *   crawl → filter → process → index → facts → entities → score → expert → assets → finalize
 *
 * Every phase is idempotent (marker-based, see docs/knowledge/knowledge-ingestion-pipeline.md):
 *   index   → upsert by {domain, sourceUrl, title} with $setOnInsert
 *   facts   → `_factsExtracted` per page + factKey upsert
 *   entities→ `_entityExtracted` per fact
 *   score   → `_embeddedAt` / `_auditedAt` per fact
 *
 * Progress is persisted to `knowledge_seed_status` so the API/UI can poll, and
 * surfaced live through an optional ProgressFn.
 */
import { getDb, ObjectId } from '@regno/db';
import { Collections } from '@regno/shared';
import type { Db } from 'mongodb';
import { crawlSite } from './crawler.js';
import { filterPages } from './filter.js';
import { bulkIndex } from './indexer.js';
import { extractFacts } from './facts.js';
import { extractEntities } from './entities.js';
import { scoreAndEmbed } from './scoring.js';
import { ingestAssets } from './assets.js';
import { generateDomainExpert } from './expert.js';
import { finalizeSeed, type SeedCounts } from './finalize.js';
import { upsertStatus, getStatus } from './status.js';
import { chunkDocument } from './process.js';
import type { CrawledPage, IngestProgress, PhaseName, ProgressFn, SeedInput, SeedSummary } from './types.js';

export const ALL_PHASES: PhaseName[] = ['crawl', 'filter', 'process', 'index', 'facts', 'entities', 'score', 'expert', 'assets', 'finalize'];

/** [start, end) weights so per-phase fraction maps to an overall 0–1 progress. */
const WEIGHTS: Record<PhaseName, [number, number]> = {
  crawl: [0, 0.12],
  filter: [0.12, 0.2],
  process: [0.2, 0.28],
  index: [0.28, 0.45],
  facts: [0.45, 0.68],
  entities: [0.68, 0.76],
  score: [0.76, 0.9],
  expert: [0.9, 0.94],
  assets: [0.94, 0.97],
  finalize: [0.97, 1],
};

function overallProgress(phase: PhaseName, frac: number): number {
  const [a, b] = WEIGHTS[phase];
  return Math.min(0.999, a + (b - a) * Math.max(0, Math.min(1, frac)));
}

/** regnostandard.com → 'regnostandard' (hostname minus www and the TLD). */
export function deriveDomain(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    const parts = host.split('.').filter(Boolean);
    if (parts.length >= 2) parts.pop();
    return parts.join('-') || host;
  } catch {
    return 'domain';
  }
}

export interface RunContext {
  db: Db;
  seedId: string;
  domain: string;
  name: string;
  input: SeedInput;
  enabled: Set<PhaseName>;
  counts: SeedCounts;
  logs: string[];
  currentPhase: PhaseName;
  onProgress?: ProgressFn;
}

function emit(ctx: RunContext, phase: PhaseName, frac: number, stage: string): void {
  const p: IngestProgress = {
    seedId: ctx.seedId,
    phase,
    progress: overallProgress(phase, frac),
    stage,
    stats: { ...ctx.counts },
    log: ctx.logs.slice(-40),
  };
  ctx.onProgress?.(p);
}

async function loadStagedPages(ctx: RunContext): Promise<CrawledPage[]> {
  const docs = await ctx.db
    .collection(Collections.KNOWLEDGE_STAGING)
    .find({ seedId: ctx.seedId, sourceType: 'web' })
    .toArray();
  return docs.map((d) => ({
    url: String(d.url ?? ''),
    title: String(d.title ?? ''),
    content: String(d.content ?? ''),
    markdown: String(d.markdown ?? ''),
    assets: Array.isArray(d.assets) ? d.assets.map(String) : [],
    links: Array.isArray(d.links) ? d.links.map(String) : [],
    category: String(d.category ?? 'docs'),
    _domain: String(d._domain ?? ctx.domain),
    status: Number(d.status ?? 200),
    crawledAt: new Date(d.crawledAt ?? Date.now()),
  }));
}

async function persistStagedPages(ctx: RunContext, pages: CrawledPage[]): Promise<void> {
  const coll = ctx.db.collection(Collections.KNOWLEDGE_STAGING);
  for (const p of pages) {
    await coll.updateOne(
      { seedId: ctx.seedId, url: p.url, sourceType: 'web' },
      {
        $set: {
          title: p.title,
          content: p.content,
          markdown: p.markdown,
          assets: p.assets,
          links: p.links,
          category: p.category,
          _domain: p._domain,
          status: p.status,
          domain: ctx.domain,
          crawledAt: p.crawledAt,
          compressed: p.content.slice(0, 8000),
          score: p._domain === ctx.domain ? 1 : 0.5,
          promotedAt: null,
        },
        $setOnInsert: { seedId: ctx.seedId, url: p.url, sourceType: 'web', createdAt: new Date() },
      },
      { upsert: true },
    );
  }
}

async function phaseCrawl(ctx: RunContext): Promise<CrawledPage[]> {
  emit(ctx, 'crawl', 0.02, 'Discovering sitemap + robots.txt');
  const staged = await loadStagedPages(ctx);
  const skipUrls = new Set(staged.map((s) => s.url));
  const { pages, stats } = await crawlSite({
    seed: ctx.input,
    skipUrls,
    onStage: (m) => ctx.logs.push(m),
  });
  ctx.logs.push(`crawl: ${stats.fetched} fetched · ${stats.discovered} sitemap · ${stats.skippedRobots} robots-blocked`);

  // Merge fresh pages over staged (fresh wins), persist for delta/resume.
  const byUrl = new Map<string, CrawledPage>();
  for (const p of pages) byUrl.set(p.url, p);
  for (const p of staged) if (!byUrl.has(p.url)) byUrl.set(p.url, p);
  const merged = [...byUrl.values()];
  await persistStagedPages(ctx, merged);
  ctx.counts.documentsIngested = merged.length;
  emit(ctx, 'crawl', 1, `Crawl complete: ${merged.length} pages`);
  return merged;
}

async function phaseFilter(ctx: RunContext, pages: CrawledPage[]): Promise<CrawledPage[]> {
  emit(ctx, 'filter', 0.05, 'Scoring relevance');
  const filtered = await filterPages(pages, {
    seed: ctx.input,
    onStage: (m) => ctx.logs.push(m),
  });
  await persistStagedPages(ctx, filtered);
  emit(ctx, 'filter', 1, `Filter complete: ${filtered.filter((p) => p.category === 'docs').length} on-topic`);
  return filtered;
}

async function phaseProcess(ctx: RunContext, pages: CrawledPage[]): Promise<void> {
  let chunks = 0;
  for (const p of pages) chunks += chunkDocument(p.title, p.content).length;
  emit(ctx, 'process', 1, `Process complete: ${chunks} chunks from ${pages.length} pages`);
}

async function phaseIndex(ctx: RunContext, pages: CrawledPage[]): Promise<void> {
  emit(ctx, 'index', 0.1, 'Bulk indexing to cortex_index');
  const stats = await bulkIndex(ctx.db, ctx.domain, ctx.seedId, pages, (m) => ctx.logs.push(m));
  emit(ctx, 'index', 1, `Indexed ${stats.chunks} chunks (${stats.inserted} new)`);
}

async function phaseFacts(ctx: RunContext): Promise<void> {
  emit(ctx, 'facts', 0.05, 'Extracting atomic facts');
  const { written } = await extractFacts(ctx.db, ctx.domain, ctx.seedId, (m) => ctx.logs.push(m));
  ctx.counts.facts = written;
  emit(ctx, 'facts', 1, `Facts: ${written} extracted`);
}

async function phaseEntities(ctx: RunContext): Promise<void> {
  emit(ctx, 'entities', 0.1, 'Extracting named entities');
  const { entities } = await extractEntities(ctx.db, ctx.domain, (m) => ctx.logs.push(m));
  ctx.counts.entities = entities;
  emit(ctx, 'entities', 1, `Entities: ${entities}`);
}

async function phaseScore(ctx: RunContext): Promise<void> {
  emit(ctx, 'score', 0.05, 'Scoring + embedding facts');
  const { embedded } = await scoreAndEmbed(ctx.db, ctx.domain, ctx.input.description ?? ctx.name, (m) => ctx.logs.push(m));
  ctx.counts.vectors = embedded;
  emit(ctx, 'score', 1, `Score/embed: ${embedded} vectors → Qdrant`);
}

async function phaseExpert(ctx: RunContext): Promise<void> {
  emit(ctx, 'expert', 0.1, 'Compiling domain expert');
  await generateDomainExpert(ctx.db, ctx.domain, (m) => ctx.logs.push(m));
  emit(ctx, 'expert', 1, 'Domain expert compiled');
}

async function phaseAssets(ctx: RunContext, pages: CrawledPage[]): Promise<void> {
  emit(ctx, 'assets', 0.1, 'Downloading assets → GridFS');
  const stored = await ingestAssets(
    ctx.db,
    ctx.domain,
    ctx.seedId,
    pages,
    { enabled: ctx.input.assets !== false, vision: ctx.input.vision === true },
    (m) => ctx.logs.push(m),
  );
  ctx.counts.assets = stored;
  emit(ctx, 'assets', 1, `Assets: ${stored}`);
}

/**
 * Run the full (or phase-subset) pipeline for a seed. Resumable: markers in
 * cortex_index / cortex_knowledge_facts make re-runs pick up where they stopped.
 */
export async function runSeedWorker(input: SeedInput, seedId: string, onProgress?: ProgressFn): Promise<SeedSummary> {
  const db = await getDb();
  const domain = input.domain ?? deriveDomain(input.url);
  const name = input.name ?? domain;
  const enabled = new Set(input.phases?.length ? input.phases : ALL_PHASES);
  const ctx: RunContext = {
    db,
    seedId,
    domain,
    name,
    input,
    enabled,
    counts: { documentsIngested: 0, facts: 0, entities: 0, vectors: 0, assets: 0 },
    logs: [],
    currentPhase: 'crawl',
    onProgress,
  };

  await upsertStatus(db, seedId, {
    name,
    url: input.url,
    domain,
    status: 'running',
    phase: 'crawl',
    progress: 0.01,
    checkpoint: 'crawl',
    log: [],
    error: undefined,
    finishedAt: undefined,
  });
  ctx.logs.push(`seed ${seedId} · ${name} · ${input.url} → domain ${domain}`);

  try {
    let pages: CrawledPage[] = [];

    if (enabled.has('crawl')) {
      ctx.currentPhase = 'crawl';
      pages = await phaseCrawl(ctx);
    } else pages = await loadStagedPages(ctx);

    if (enabled.has('filter')) {
      ctx.currentPhase = 'filter';
      pages = await phaseFilter(ctx, pages);
    }
    if (enabled.has('process')) {
      ctx.currentPhase = 'process';
      await phaseProcess(ctx, pages);
    }
    if (enabled.has('index')) {
      ctx.currentPhase = 'index';
      await phaseIndex(ctx, pages);
    }
    if (enabled.has('facts')) {
      ctx.currentPhase = 'facts';
      await phaseFacts(ctx);
    }
    if (enabled.has('entities')) {
      ctx.currentPhase = 'entities';
      await phaseEntities(ctx);
    }
    if (enabled.has('score')) {
      ctx.currentPhase = 'score';
      await phaseScore(ctx);
    }
    if (enabled.has('expert')) {
      ctx.currentPhase = 'expert';
      await phaseExpert(ctx);
    }
    if (enabled.has('assets')) {
      ctx.currentPhase = 'assets';
      await phaseAssets(ctx, pages);
    }
    ctx.currentPhase = 'finalize';

    const { grade, description } = await finalizeSeed(
      db,
      { seedId, name, url: input.url, domain },
      ctx.counts,
      (m) => ctx.logs.push(m),
    );

    await upsertStatus(db, seedId, {
      status: 'done',
      phase: 'finalize',
      progress: 1,
      checkpoint: 'done',
      grade,
      description,
      finishedAt: new Date(),
      log: ctx.logs,
      documentsIngested: ctx.counts.documentsIngested,
      facts: ctx.counts.facts,
      entities: ctx.counts.entities,
      vectors: ctx.counts.vectors,
      assets: ctx.counts.assets,
    });
    return (await getStatus(db, seedId)) as SeedSummary;
  } catch (e) {
    const msg = (e as Error).message;
    ctx.logs.push(`ERROR: ${msg}`);
    await upsertStatus(db, seedId, {
      status: 'failed',
      phase: ctx.currentPhase,
      error: msg,
      log: ctx.logs,
      finishedAt: new Date(),
    });
    throw e;
  }
}

/** Derive + return a seedId, persist the 'queued' marker, then run detached. */
export function startSeed(input: SeedInput, onProgress?: ProgressFn): string {
  const seedId = input.seedId ?? new ObjectId().toHexString();
  void (async () => {
    const db = await getDb();
    await upsertStatus(db, seedId, { status: 'queued', phase: 'idle', progress: 0, checkpoint: 'queued' });
  })().catch(() => undefined);
  void runSeedWorker(input, seedId, onProgress).catch((e) => {
    console.error(`[ingest] seed ${seedId} failed:`, (e as Error).message);
  });
  return seedId;
}

/** Awaitable variant for CLI / scripts. */
export async function runSeed(input: SeedInput, onProgress?: ProgressFn): Promise<SeedSummary> {
  const seedId = input.seedId ?? new ObjectId().toHexString();
  const db = await getDb();
  await upsertStatus(db, seedId, { status: 'queued', phase: 'idle', progress: 0, checkpoint: 'queued' });
  return runSeedWorker(input, seedId, onProgress);
}
