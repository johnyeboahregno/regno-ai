/**
 * Server-side access to the generated CORTEX pattern catalog
 * (apps/web/src/lib/cortex/pattern-catalog.ts, produced by
 * scripts/build-pattern-catalog.mjs from docs/cortex/CORTEX_PATTERN_CATALOG.md).
 */
import { CATALOG_PATTERNS, type CatalogPattern } from '$lib/cortex/pattern-catalog.js';

export type { CatalogPattern };
export const allPatterns = CATALOG_PATTERNS;

export interface CatalogFilter {
  category?: string;
  priority?: string;
  foundation?: boolean;
  sticky?: boolean;
  minConfidence?: number;
  search?: string;
}

/** Filter the catalog (mirrors the reference GET /api/cortex/patterns params). */
export function filterCatalog(filter: CatalogFilter = {}): CatalogPattern[] {
  const q = (filter.search ?? '').toLowerCase().trim();
  return CATALOG_PATTERNS.filter((p) => {
    if (filter.category && p.category !== filter.category) return false;
    if (filter.priority && p.priority !== filter.priority) return false;
    if (filter.foundation !== undefined && p.foundation !== filter.foundation) return false;
    if (filter.sticky !== undefined && p.sticky !== filter.sticky) return false;
    if (filter.minConfidence !== undefined && p.confidence < filter.minConfidence) return false;
    if (q && !`${p.id} ${p.name} ${p.description ?? ''}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

/** Aggregate catalog statistics (totals, by-category, by-priority). */
export function catalogStats() {
  const byCategory: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  let foundation = 0;
  let sticky = 0;
  for (const p of CATALOG_PATTERNS) {
    byCategory[p.category] = (byCategory[p.category] ?? 0) + 1;
    byPriority[p.priority] = (byPriority[p.priority] ?? 0) + 1;
    if (p.foundation) foundation += 1;
    if (p.sticky) sticky += 1;
  }
  return { total: CATALOG_PATTERNS.length, byCategory, byPriority, foundation, sticky };
}

export function getPatternById(id: string): CatalogPattern | undefined {
  return CATALOG_PATTERNS.find((p) => p.id === id);
}
