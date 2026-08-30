// POST /api/cortex/patterns/provision — provision selected foundation patterns
// from the catalog into the three stores (Mongo → Qdrant → Neo4j) via the
// @regno/cortex createPattern flow. Supports a dry-run cost/storage estimate
// (mirrors the reference PatternProvisioningService).
import { json } from '@sveltejs/kit';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';
import { createPattern } from '@regno/cortex';
import { getPatternById } from '$lib/server/cortex/catalog.js';
import { requireSession } from '$lib/server/auth.js';

// Embedding model is text-embedding-3-small (see @regno/ai) — $0.02 / 1M tokens.
const EMBED_COST_PER_M = 0.02;
const VECTOR_DIMS = 1536; // text-embedding-3-small

/** Rough token estimate: ~4 chars per token for english text. */
function estTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export async function POST({ request, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    patternIds?: string[];
    dryRun?: boolean;
  };
  const ids = Array.isArray(body.patternIds)
    ? body.patternIds.map(String).filter(Boolean)
    : [];
  if (!ids.length) return json({ ok: false, error: 'patternIds is required' }, { status: 400 });

  const patterns = ids.map((id) => getPatternById(id)).filter((p): p is NonNullable<typeof p> => !!p);
  if (!patterns.length) return json({ ok: false, error: 'No known catalog patterns matched' }, { status: 404 });

  // Which of these are already provisioned? (idempotent upsert, but surface it.)
  const db = await getDb();
  const existing = new Set<string>();
  try {
    const rows = await db
      .collection(Collections.CORTEX_PATTERNS)
      .find({ _id: { $in: patterns.map((p) => p.id) } } as never)
      .project({ _id: 1 })
      .toArray();
    for (const r of rows) existing.add(String(r._id));
  } catch {
    /* mongo unavailable — proceed to dry-run only */
  }

  // Estimate embedding cost + storage (used by dry-run AND the real summary).
  const totalTokens = patterns.reduce((n, p) => n + estTokens(`${p.name}\n${p.description}`), 0);
  const estimate = {
    patterns: patterns.length,
    tokens: totalTokens,
    costUsd: (totalTokens / 1_000_000) * EMBED_COST_PER_M,
    storageBytes: patterns.length * (VECTOR_DIMS * 4 + 2048 + 5120), // vector + graph node + doc
    durationSec: Math.max(1, Math.round(patterns.length * 0.5)),
    warnings: existing.size ? `${existing.size} of these are already provisioned (will be updated)` : null,
  };

  if (body.dryRun) {
    return json({ ok: true, dryRun: true, estimate });
  }

  let provisioned = 0;
  let failed = 0;
  const errors: Array<{ id: string; error: string }> = [];
  for (const p of patterns) {
    try {
      await createPattern({
        id: p.id,
        name: p.name,
        description: p.description ?? '',
        tags: [
          p.category,
          `priority:${p.priority.toLowerCase()}`,
          ...(p.foundation ? ['foundation'] : []),
          ...(p.sticky ? ['sticky'] : []),
        ],
        confidence: p.confidence,
        domain: p.category,
        source: 'catalog',
        nodeSequence: p.nodeSequence ?? [],
        useCases: p.useCases ?? [],
        successCriteria: p.successCriteria,
        costProfile: p.costProfile,
        metadata: p.metadata,
      });
      provisioned += 1;
    } catch (e) {
      failed += 1;
      errors.push({ id: p.id, error: (e as Error).message });
    }
  }

  return json({ ok: true, dryRun: false, provisioned, failed, errors, estimate });
}
