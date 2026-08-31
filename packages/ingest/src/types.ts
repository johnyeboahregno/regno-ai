/**
 * @regno/ingest — shared types for the knowledge ingestion pipeline.
 * Mirrors docs/knowledge/knowledge-ingestion-pipeline.md and
 * docs/architecture/KNOWLEDGE_INGESTION_PIPELINE.md.
 */

/** A user-requested knowledge seed (e.g. https://www.regnostandard.com). */
export interface SeedInput {
  /** Target site URL. */
  url: string;
  /** Optional human label; defaults to the domain. */
  name?: string;
  /** Cortex domain key; derived from the hostname if omitted (regnostandard.com → 'regnostandard'). */
  domain?: string;
  /** One-line description used for relevance filtering + scoring anchor. */
  description?: string;
  /** Max pages to crawl. Default 30. */
  maxPages?: number;
  /** Link-follow depth. Default 2. */
  depth?: number;
  /** Polite-crawl delay between requests. Default 800ms. */
  rateLimitMs?: number;
  /** Explicit seedId — pass to resume an existing seed (checkpoint/resume). */
  seedId?: string;
  /** Subset of phases to run (default: all). */
  phases?: PhaseName[];
  /** Allow LLM usage for filtering/facts/entities/expert. Default true (falls back to deterministic when no key). */
  llm?: boolean;
  /** Enable asset (image/pdf) download into GridFS. Default true. */
  assets?: boolean;
  /** Enable vision description of assets. Requires a vision-capable model — currently unsupported (skipped). */
  vision?: boolean;
}

export type PhaseName =
  | 'crawl'
  | 'filter'
  | 'process'
  | 'index'
  | 'facts'
  | 'entities'
  | 'score'
  | 'expert'
  | 'assets'
  | 'finalize';

/** A page captured by the crawler, pre-storage. */
export interface CrawledPage {
  url: string;
  title: string;
  /** Plain-text content (no markdown syntax). */
  content: string;
  /** Markdown rendering of the page body. */
  markdown: string;
  /** Asset URLs (images, PDFs) found on the page. */
  assets: string[];
  /** Outbound same-host links (for depth-based crawling). */
  links: string[];
  /** Relevance category (set by the filter phase; defaults to 'docs'). */
  category: string;
  /** Effective domain after reclassification, e.g. `regnostandard.tech`. */
  _domain: string;
  /** HTTP status of the fetch. */
  status: number;
  /** Fetched-at timestamp. */
  crawledAt: Date;
}

/** A single atomic fact extracted from an indexed page. */
export interface KnowledgeFact {
  factKey: string;
  seedId: string;
  domain: string;
  sourceUrl: string;
  content: string;
  confidence: number;
  entities: string[];
  _entityExtracted?: boolean;
  _relevanceScore?: number;
  _auditedAt?: Date;
  _embeddedAt?: Date;
  vectorId?: string;
}

/** Progress callback surfaced to the API/CLI/UI. */
export interface IngestProgress {
  seedId: string;
  phase: PhaseName;
  /** Overall 0–1 progress across all phases. */
  progress: number;
  /** Human stage label, e.g. 'Fetching 12/30 pages'. */
  stage: string;
  stats: {
    documentsIngested: number;
    facts: number;
    entities: number;
    vectors: number;
    assets: number;
  };
  log: string[];
}

export type ProgressFn = (p: IngestProgress) => void;

/** Final per-seed summary persisted to knowledge_seed_status. */
export interface SeedSummary {
  seedId: string;
  name: string;
  url: string;
  domain: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  phase: PhaseName | 'idle';
  progress: number;
  documentsIngested: number;
  facts: number;
  entities: number;
  vectors: number;
  assets: number;
  grade?: string;
  description?: string;
  checkpoint: string;
  error?: string;
  startedAt: Date;
  updatedAt: Date;
  finishedAt?: Date;
  log: string[];
}
