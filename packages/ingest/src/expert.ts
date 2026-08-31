/**
 * Domain expert generation — compiles all indexed pages for a domain into a
 * versioned expert artifact (`cortex_domain_experts`). Deterministic
 * condensation first (free), then an LLM compile. Hash-based diffing: when the
 * condensed corpus is unchanged, the existing artifact is kept (version, don't
 * overwrite).
 */
import type { Db } from 'mongodb';
import { createHash } from 'node:crypto';
import { Collections } from '@regno/shared';
import { chatSafe } from './lib/llm.js';
import { condense } from './process.js';

const MAX_PAGES = 200;

export interface ExpertResult {
  version: number;
  changed: boolean;
  completenessScore: number;
}

function sha1(s: string): string {
  return createHash('sha1').update(s).digest('hex');
}

export async function generateDomainExpert(
  db: Db,
  domain: string,
  onStage?: (msg: string) => void,
): Promise<ExpertResult> {
  const pages = await db
    .collection(Collections.CORTEX_INDEX)
    .find({ domain })
    .project({ title: 1, content: 1, sourceUrl: 1 })
    .limit(MAX_PAGES)
    .toArray();

  if (!pages.length) {
    onStage?.('Expert: no indexed pages yet — skipped');
    return { version: 0, changed: false, completenessScore: 0 };
  }

  const condensed = pages
    .map((p) => `# ${String(p.title ?? p.sourceUrl)}\n\n${condense(String(p.content ?? ''))}`)
    .join('\n\n---\n\n');
  const condensedHash = sha1(condensed).slice(0, 16);

  const existing = await db.collection(Collections.CORTEX_DOMAIN_EXPERTS).findOne({ domain });
  if (existing && existing.condensedHash === condensedHash) {
    onStage?.(`Expert: unchanged (v${existing.version}) — keeping existing artifact`);
    return { version: Number(existing.version ?? 0), changed: false, completenessScore: Number(existing.completenessScore ?? 0) };
  }

  const source = condensed.slice(0, 30000);
  let artifact: Record<string, unknown> | null = null;
  const raw = await chatSafe(
    [
      {
        role: 'system',
        content:
          'You are a domain expert compiler. Produce a structured, dense knowledge artifact as strict JSON: {"overview":string, "keyConcepts":[string], "specifications":[{name,details}], "glossary":{term:definition}, "qualityNotes":string}. No prose outside the JSON.',
      },
      { role: 'user', content: `Compile an expert-level artifact for the "${domain}" domain from the corpus below.\n\nCORPUS:\n${source}` },
    ],
    { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.2, maxTokens: 4000 },
  );
  if (raw) {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        artifact = JSON.parse(m[0]);
      } catch {
        artifact = null;
      }
    }
  }

  // Keyless/deterministic fallback artifact.
  if (!artifact) {
    artifact = {
      overview: condense(condensed, 6000),
      keyConcepts: [],
      specifications: [],
      glossary: {},
      qualityNotes: 'Deterministic condensation (no LLM key available at compile time).',
      generatedFrom: 'condensation-fallback',
    };
  }

  const version = Number(existing?.version ?? 0) + 1;
  const completenessScore = Math.min(1, pages.length / 10);
  await db.collection(Collections.CORTEX_DOMAIN_EXPERTS).updateOne(
    { domain },
    {
      $set: {
        domain,
        version,
        artifact,
        condensedHash,
        completenessScore,
        pages: pages.length,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true },
  );
  onStage?.(`Expert: compiled v${version} (${pages.length} pages, completeness ${completenessScore.toFixed(2)})`);
  return { version, changed: true, completenessScore };
}
