// GET /api/cortex/catalog — the 82-pattern foundation catalog (from
// docs/cortex/CORTEX_PATTERN_CATALOG.md) with optional filters, mirroring the
// reference GET /api/cortex/patterns catalog endpoint.
import { json } from '@sveltejs/kit';
import { filterCatalog, catalogStats } from '$lib/server/cortex/catalog.js';

export async function GET({ url }) {
  const foundation = url.searchParams.get('foundation');
  const sticky = url.searchParams.get('sticky');
  const minConfidence = url.searchParams.get('minConfidence');

  const patterns = filterCatalog({
    category: url.searchParams.get('category') ?? undefined,
    priority: url.searchParams.get('priority') ?? undefined,
    foundation: foundation === null ? undefined : foundation === 'true',
    sticky: sticky === null ? undefined : sticky === 'true',
    minConfidence: minConfidence ? Number(minConfidence) : undefined,
    search: url.searchParams.get('search') ?? undefined,
  });

  return json({ ok: true, ...catalogStats(), patterns });
}
