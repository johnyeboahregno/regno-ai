/**
 * Phase 4 — bulk index (Wave 1).
 * Writes processed chunks into `cortex_index` via idempotent bulkWrite upsert
 * keyed on {domain, sourceUrl, title}. `$setOnInsert` prevents overwriting
 * existing content (non-destructive); `$set` only touches status/seed/category.
 */
import type { Db } from 'mongodb';
import { Collections } from '@regno/shared';
import { chunkDocument } from './process.js';
import type { CrawledPage } from './types.js';

export interface IndexStats {
  inserted: number;
  updated: number;
  chunks: number;
}

export async function bulkIndex(
  db: Db,
  domain: string,
  seedId: string,
  pages: CrawledPage[],
  onStage?: (msg: string) => void,
): Promise<IndexStats> {
  const coll = db.collection(Collections.CORTEX_INDEX);
  const stats: IndexStats = { inserted: 0, updated: 0, chunks: 0 };
  const ops: Array<Record<string, unknown>> = [];

  const flush = async () => {
    if (!ops.length) return;
    const res = await coll.bulkWrite(ops as never, { ordered: false });
    stats.inserted += res.upsertedCount ?? 0;
    stats.updated += res.modifiedCount ?? 0;
    ops.length = 0;
  };

  for (const page of pages) {
    const effDomain = page._domain || domain;
    const chunks = chunkDocument(page.title, page.content);
    for (const c of chunks) {
      const title = c.part ? `${c.title} ${c.part}` : c.title;
      ops.push({
        updateOne: {
          filter: { domain: effDomain, sourceUrl: page.url, title },
          update: {
            $set: {
              status: 'indexed',
              seedId,
              category: page.category,
              lastSeenAt: new Date(),
            },
            $setOnInsert: {
              title,
              content: c.content,
              markdown: page.markdown,
              domain: effDomain,
              sourceUrl: page.url,
              category: page.category,
              _factsExtracted: false,
              indexedAt: new Date(),
              version: 1,
            },
          },
          upsert: true,
        },
      });
      stats.chunks++;
      if (ops.length >= 1000) await flush();
    }
  }
  await flush();
  onStage?.(`Indexed ${stats.chunks} chunks (${pages.length} pages) into cortex_index`);
  return stats;
}
