/**
 * knowledge_seed_status persistence helpers (ingestion progress + resume).
 */
import type { Db } from 'mongodb';
import { Collections } from '@regno/shared';
import type { SeedSummary } from './types.js';

export type StatusPatch = Partial<Omit<SeedSummary, 'seedId' | 'startedAt' | 'log'>> & { log?: string[] };

export async function upsertStatus(db: Db, seedId: string, patch: StatusPatch): Promise<void> {
  const now = new Date();
  await db.collection(Collections.KNOWLEDGE_SEED_STATUS).updateOne(
    { seedId },
    {
      $set: { ...patch, updatedAt: now },
      $setOnInsert: { seedId, startedAt: now, log: [] },
    },
    { upsert: true },
  );
}

export async function getStatus(db: Db, seedId: string): Promise<SeedSummary | null> {
  return (await db.collection(Collections.KNOWLEDGE_SEED_STATUS).findOne({ seedId })) as SeedSummary | null;
}

export async function listSeeds(db: Db, limit = 50): Promise<SeedSummary[]> {
  return (await db
    .collection(Collections.KNOWLEDGE_SEED_STATUS)
    .find({})
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray()) as unknown as SeedSummary[];
}
