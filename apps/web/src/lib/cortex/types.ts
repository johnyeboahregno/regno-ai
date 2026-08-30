/** Shared types for the CORTEX page (matches GET /api/cortex/health + catalog). */

export interface KnowledgeItem {
  key: string;
  glyph: string;
  label: string;
  value: number;
}

export interface CortexService {
  key: string;
  name: string;
  role: string;
  status: 'online' | 'offline' | 'degraded' | 'idle';
  detail: string;
  sync?: 'in-sync' | 'out-of-sync' | null;
}

export interface DomainRow {
  domain: string;
  count: number;
  avgConfidence: number;
  successRate: string;
}

export interface CortexHealthData {
  ok: boolean;
  checkedAt: string;
  patterns: { total: number; active7d: number; highPerformers: number; lowConfidence: number };
  knowledge: KnowledgeItem[];
  knowledgeTotal: number;
  services: CortexService[];
  learning: { created7d: number; used7d: number; totalSuccesses: number; totalFailures: number };
  patternsByDomain: DomainRow[];
}

export interface CatalogPattern {
  id: string;
  name: string;
  category: string;
  priority: string;
  foundation: boolean;
  sticky: boolean;
  confidence: number;
  description?: string;
  nodeSequence?: string[];
  useCases?: string[];
  edgeCount?: number;
  successCriteria?: Record<string, unknown>;
  costProfile?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CatalogResponse {
  ok: boolean;
  total: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  foundation: number;
  sticky: number;
  patterns: CatalogPattern[];
}
