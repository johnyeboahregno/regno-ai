/**
 * Phase 8 — asset pipeline.
 * Downloads images/PDFs referenced by crawled pages into the GridFS
 * `cortex_assets` bucket (dedup by sourceUrl+domain), links `assetRefs` back to
 * `cortex_index` pages. Vision description is a documented no-op: the current
 * @regno/ai gateway is text-only, so assets are stored with `pendingVision: true`.
 */
import type { Db } from 'mongodb';
import { GridFSBucket } from 'mongodb';
import { Collections } from '@regno/shared';
import type { CrawledPage } from './types.js';

const ASSET_RE = /\.(png|jpe?g|gif|webp|svg|avif|pdf|ico)([?#].*)?$/i;
const BUCKET = 'cortex_assets';
const MAX_ASSETS = 50;
const MAX_BYTES = 8 * 1024 * 1024; // 8MB cap per asset

export interface AssetOptions {
  enabled: boolean;
  vision?: boolean;
}

export async function ingestAssets(
  db: Db,
  domain: string,
  seedId: string,
  pages: CrawledPage[],
  opts: AssetOptions,
  onStage?: (msg: string) => void,
): Promise<number> {
  if (!opts.enabled) {
    onStage?.('Assets: skipped (disabled)');
    return 0;
  }

  const urls = new Set<string>();
  for (const p of pages) for (const a of p.assets) if (ASSET_RE.test(a)) urls.add(a);
  const candidates = [...urls].slice(0, MAX_ASSETS);
  if (!candidates.length) {
    onStage?.('Assets: none found');
    return 0;
  }

  const bucket = new GridFSBucket(db, { bucketName: BUCKET });
  const files = db.collection(`${BUCKET}.files`);
  let stored = 0;

  for (const url of candidates) {
    // GridFS dedup by sourceUrl + domain.
    const existing = await files.findOne({ 'metadata.sourceUrl': url, 'metadata.domain': domain }).catch(() => null);
    if (existing) continue;

    let res: Response;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: 'follow' });
      if (!res.ok) continue;
    } catch {
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length || buf.length > MAX_BYTES) continue;

    const filename = `${domain}/${new URL(url).pathname.split('/').pop() ?? 'asset'}`;
    try {
      await new Promise<void>((resolve, reject) => {
        const stream = bucket.openUploadStream(filename, {
          metadata: { sourceUrl: url, domain, seedId, contentType: res.headers.get('content-type') ?? '', size: buf.length, pendingVision: true },
        });
        stream.on('error', (err) => reject(err));
        stream.on('finish', () => resolve());
        stream.end(buf);
      });
      stored++;
      onStage?.(`Assets: stored ${stored}/${candidates.length} (${url})`);
    } catch {
      /* skip failed upload */
    }
  }

  // Link assetRefs back to indexed pages.
  if (stored) {
    for (const p of pages) {
      const refs = p.assets.filter((a) => ASSET_RE.test(a));
      if (!refs.length) continue;
      await db
        .collection(Collections.CORTEX_INDEX)
        .updateMany({ domain, sourceUrl: p.url }, { $addToSet: { assetRefs: { $each: refs } } });
    }
  }

  if (opts.vision) onStage?.('Assets: vision describe skipped — @regno/ai gateway is text-only (stored with pendingVision: true)');
  else onStage?.(`Assets: ${stored} stored to GridFS ${BUCKET}`);
  return stored;
}
