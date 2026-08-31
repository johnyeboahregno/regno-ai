/**
 * SiteCrawlerService — BFS web crawler.
 * Discovers pages from sitemap.xml + robots.txt, follows same-host links up to
 * a depth/page cap with a polite rate limit, converts HTML → Markdown, and
 * collects links + asset URLs per page.
 */
import { htmlToPage } from './lib/html.js';
import { sleep } from './lib/llm.js';
import type { CrawledPage, SeedInput } from './types.js';

const UA = 'regno-ingest/1.0 (knowledge-seed crawler)';
const CONTENT_TYPES = /text\/html|application\/xhtml\+xml/i;

export interface CrawlStats {
  discovered: number;
  fetched: number;
  skippedRobots: number;
}

export interface RobotsRules {
  disallows: RegExp[];
  sitemaps: string[];
  /** True when /robots.txt is unreachable or absent → treat as no rules. */
  lenient: boolean;
}

export async function fetchRobots(origin: string): Promise<RobotsRules> {
  const rules: RobotsRules = { disallows: [], sitemaps: [], lenient: true };
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    });
    if (!res.ok) return rules;
    const body = await res.text();
    rules.lenient = false;
    let group = false;
    for (const raw of body.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const [k, ...rest] = line.split(':');
      const key = k.trim().toLowerCase();
      const val = rest.join(':').trim();
      if (key === 'user-agent') {
        group = val === '*' || val.toLowerCase().includes('regno');
      } else if (group) {
        if (key === 'disallow' && val) {
          try {
            const pattern = '^' + val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*');
            rules.disallows.push(new RegExp(pattern));
          } catch {
            /* skip malformed rule */
          }
        } else if (key === 'sitemap' && val) {
          rules.sitemaps.push(val);
        }
      } else if (key === 'sitemap' && val) {
        // sitemap lines are global (not user-agent scoped)
        rules.sitemaps.push(val);
      }
    }
  } catch {
    /* robots.txt unreachable → lenient */
  }
  return rules;
}

export function isDisallowed(rules: RobotsRules, url: string): boolean {
  if (rules.lenient || !rules.disallows.length) return false;
  const u = new URL(url);
  const path = u.pathname + u.search;
  return rules.disallows.some((re) => re.test(path));
}

/** Parse <loc> URLs out of a sitemap (handles sitemap index + urlset). */
function parseSitemap(xml: string, base: string): string[] {
  const urls: string[] = [];
  const re = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const raw = m[1].trim();
    try {
      urls.push(new URL(raw, base).toString());
    } catch {
      /* skip malformed */
    }
  }
  return urls;
}

async function tryFetch(url: string, timeoutMs = 15000): Promise<Response | null> {
  try {
    return await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    });
  } catch {
    return null;
  }
}

/** Discover sitemap URLs (robots sitemaps → /sitemap.xml fallback). */
async function discoverSitemapUrls(robots: RobotsRules, origin: string, host: string): Promise<string[]> {
  const candidates = robots.sitemaps.length
    ? robots.sitemaps
    : [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`, `${origin}/sitemap-index.xml`];
  const found = new Set<string>();
  for (const cand of candidates) {
    const res = await tryFetch(cand, 8000);
    if (!res || !res.ok) continue;
    const body = await res.text();
    for (const u of parseSitemap(body, cand)) {
      try {
        if (new URL(u).hostname === host) found.add(u);
      } catch {
        /* skip */
      }
    }
    if (found.size) break;
  }
  return [...found];
}

function normalize(u: string): string | null {
  try {
    const url = new URL(u);
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function sameHost(a: string, host: string): boolean {
  try {
    return new URL(a).hostname === host;
  } catch {
    return false;
  }
}

function abs(url: string, base: string): string | null {
  try {
    return new URL(url, base).toString();
  } catch {
    return null;
  }
}

async function fetchPage(url: string, host: string): Promise<CrawledPage | null> {
  const res = await tryFetch(url);
  if (!res) return null;
  const status = res.status;
  const ctype = res.headers.get('content-type') ?? '';
  if (!CONTENT_TYPES.test(ctype) && !/\.html?$/i.test(new URL(url).pathname)) return null;
  const html = await res.text();
  if (!html || html.length < 200) return null;
  const { title, markdown, text, links, assets } = htmlToPage(html);
  if (text.trim().length < 100) return null; // boilerplate-only page

  const absLinks: string[] = [];
  for (const l of links) {
    const a = abs(l, url);
    if (a && sameHost(a, host)) absLinks.push(a);
  }
  const absAssets = assets.map((a) => abs(a, url)).filter((a): a is string => !!a);

  return {
    url,
    title: title.trim() || url,
    content: text.trim(),
    markdown,
    assets: absAssets,
    links: absLinks,
    category: 'docs',
    _domain: '',
    status,
    crawledAt: new Date(),
  };
}

export interface CrawlOptions {
  seed: SeedInput;
  skipUrls?: Set<string>;
  onStage?: (msg: string) => void;
}

/** Crawl a site and return the discovered pages (deduped, same-host only). */
export async function crawlSite(opts: CrawlOptions): Promise<{ pages: CrawledPage[]; stats: CrawlStats }> {
  const { seed, skipUrls = new Set<string>(), onStage } = opts;
  const maxPages = seed.maxPages ?? 30;
  const depth = seed.depth ?? 2;
  const rate = seed.rateLimitMs ?? 800;

  const origin = new URL(seed.url).origin;
  const host = new URL(seed.url).hostname;
  const stats: CrawlStats = { discovered: 0, fetched: 0, skippedRobots: 0 };

  const robots = await fetchRobots(origin);
  const sitemapUrls = await discoverSitemapUrls(robots, origin, host);
  stats.discovered = sitemapUrls.length;

  const queue: Array<{ u: string; d: number }> = [];
  const seeded = new Set<string>();
  for (const su of sitemapUrls) {
    const n = normalize(su);
    if (n && !seeded.has(n)) {
      seeded.add(n);
      queue.push({ u: n, d: 0 });
    }
  }
  const root = normalize(seed.url);
  if (root && !seeded.has(root)) queue.push({ u: root, d: 0 });

  const visited = new Set<string>();
  const pages: CrawledPage[] = [];
  let fetched = 0;

  while (queue.length && pages.length < maxPages) {
    const item = queue.shift();
    if (!item) break;
    const norm = normalize(item.u);
    if (!norm || visited.has(norm)) continue;
    if (!sameHost(norm, host)) continue;
    if (skipUrls.has(norm)) {
      visited.add(norm);
      continue;
    }
    if (isDisallowed(robots, norm)) {
      visited.add(norm);
      stats.skippedRobots++;
      continue;
    }
    visited.add(norm);
    if (fetched > 0) await sleep(rate);

    onStage?.(`Fetching ${pages.length + 1}/${maxPages} · ${norm}`);
    const page = await fetchPage(norm, host);
    fetched++;
    stats.fetched++;
    if (!page) continue;

    pages.push(page);
    if (item.d < depth) {
      for (const link of page.links) {
        if (pages.length + queue.length >= maxPages * 2) break;
        queue.push({ u: link, d: item.d + 1 });
      }
    }
  }

  return { pages, stats };
}
