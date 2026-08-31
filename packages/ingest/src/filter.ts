/**
 * ContentRelevanceFilter — 2-outcome page relevance: accept or reclassify
 * (never discard). Reclassified pages get an `{domain}.{category}` suffix so
 * off-topic content is preserved, not dropped.
 *
 * LLM mode: batches of 10 via a cheap model. Keyless mode: deterministic
 * keyword score against the seed description.
 */
import { chatSafe, keywordScore } from './lib/llm.js';
import type { CrawledPage, SeedInput } from './types.js';

export interface FilterOptions {
  seed: SeedInput;
  onStage?: (msg: string) => void;
}

interface Verdict {
  url: string;
  accept: boolean;
  category?: string;
}

const BATCH = 10;

function parseVerdicts(raw: string | null): Verdict[] | null {
  if (!raw) return null;
  const m = raw.match(/\[[\s\S]*\]/);
  if (!m) return null;
  try {
    const arr = JSON.parse(m[0]) as Array<{ url?: string; accept?: boolean; category?: string }>;
    return arr.map((v) => ({ url: String(v.url ?? ''), accept: !!v.accept, category: v.category }));
  } catch {
    return null;
  }
}

async function llmVerdicts(batch: CrawledPage[], seed: SeedInput): Promise<Verdict[]> {
  const payload = batch.map((p) => ({
    url: p.url,
    title: p.title,
    excerpt: p.content.slice(0, 240),
  }));
  const prompt = `You are a content relevance filter for a knowledge base about: "${seed.description ?? seed.domain}".

Classify each page: accept = on-topic and worth indexing; reject = off-topic. Never choose to delete — rejected pages are reclassified under a category (e.g. "other", "legal", "marketing").

Return ONLY a JSON array (no prose):
[{"url":"...","accept":true,"category":"docs"}, ...]

Pages:
${JSON.stringify(payload, null, 2)}`;
  const raw = await chatSafe(
    [
      { role: 'system', content: 'You return strict JSON arrays only.' },
      { role: 'user', content: prompt },
    ],
    { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.2, maxTokens: 2000 },
  );
  return parseVerdicts(raw) ?? [];
}

/** Filter pages; returns the same array with `category`/`_domain` adjusted. */
export async function filterPages(pages: CrawledPage[], opts: FilterOptions): Promise<CrawledPage[]> {
  const { seed, onStage } = opts;
  if (!pages.length) return pages;

  const domain = seed.domain ?? 'domain';
  const useLlm = seed.llm !== false;

  for (let i = 0; i < pages.length; i += BATCH) {
    const batch = pages.slice(i, i + BATCH);
    let verdicts: Verdict[] = [];

    if (useLlm && seed.description) {
      verdicts = await llmVerdicts(batch, seed);
      onStage?.(`Filtering ${Math.min(i + BATCH, pages.length)}/${pages.length} pages`);
    }

    const map = new Map(verdicts.map((v) => [v.url, v]));
    for (const page of batch) {
      const v = map.get(page.url);
      if (v && v.accept === false) {
        // Reclassify — never discard.
        page.category = v.category && v.category !== 'other' ? v.category : 'other';
      } else if (!v && seed.description && !useLlm) {
        const score = keywordScore(page.content, seed.description);
        page.category = score >= 0.5 ? 'docs' : 'other';
      } else if (!v) {
        page.category = 'docs';
      }
      page._domain = page.category === 'docs' ? domain : `${domain}.${page.category}`;
    }
  }
  return pages;
}
