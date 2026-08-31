/**
 * Finalize — quality grade (derived from the fact score distribution, no LLM),
 * seed status → done, and the domain quality analysis record.
 *
 * Grade: A ≥90% facts score ≥0.6 · B ≥70% · C ≥50% · D ≥30% · F <30%.
 */
import type { Db } from 'mongodb';
import { Collections } from '@regno/shared';

export function qualityGrade(factCount: number, highScoring: number): string {
  if (!factCount) return 'F';
  const pct = highScoring / factCount;
  if (pct >= 0.9) return 'A';
  if (pct >= 0.7) return 'B';
  if (pct >= 0.5) return 'C';
  if (pct >= 0.3) return 'D';
  return 'F';
}

export interface FinalizeResult {
  grade: string;
  description: string;
}

export async function finalizeSeed(
  db: Db,
  seed: { seedId: string; name: string; url: string; domain: string },
  summary: SeedCounts,
  onStage?: (msg: string) => void,
): Promise<FinalizeResult> {
  const factsColl = db.collection(Collections.CORTEX_KNOWLEDGE_FACTS);
  const factCount = await factsColl.countDocuments({ seedId: seed.seedId });
  const highScoring = await factsColl.countDocuments({ seedId: seed.seedId, _relevanceScore: { $gte: 0.6 } });
  const grade = qualityGrade(factCount, highScoring);

  const description = `Ingested ${summary.documentsIngested} pages from ${seed.url} → ${summary.facts} facts, ${summary.entities} entities, ${summary.vectors} vectors, ${summary.assets} assets. Quality grade ${grade}.`;

  await db.collection(Collections.CORTEX_DOMAIN_ANALYSIS).updateOne(
    { domain: seed.domain },
    {
      $set: {
        domain: seed.domain,
        analysis: { grade, summary: description, factCount, highScoring, at: new Date() },
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true },
  );
  onStage?.(`Finalize: grade ${grade} (${highScoring}/${factCount} facts ≥ 0.6)`);
  return { grade, description };
}

export interface SeedCounts {
  documentsIngested: number;
  facts: number;
  entities: number;
  vectors: number;
  assets: number;
}
