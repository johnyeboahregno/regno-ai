/**
 * Architect provisioning blueprints — one doc per developer system ("Architect").
 * Non-secret config lives here; secrets are stored in the encrypted credentials
 * vault under `architect:<slug>:env` (see the wizard API + packages/db credentials).
 */
import { ObjectId } from 'mongodb';
import { getDb } from './mongo.js';
import { Collections } from '@regno/shared';

export type ArchitectStatus =
  | 'draft'
  | 'provisioning'
  | 'healthy'
  | 'degraded'
  | 'error'
  | 'decommissioned';

export type ArchitectMode = 'server' | 'k3s';

export interface ArchitectDeveloper {
  name: string;
  email: string;
  github: string;
}

export interface ArchitectTarget {
  host: string;
  sshUser: string;
  sshPort: number;
  mode: ArchitectMode;
  wipe: boolean;
}

export interface ArchitectRecord {
  _id: ObjectId;
  slug: string;
  developer: ArchitectDeveloper;
  target: ArchitectTarget;
  domain: string;
  env: Record<string, string>;
  status: ArchitectStatus;
  jobId?: string | null;
  error?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArchitectDraftInput {
  slug: string;
  developer: ArchitectDeveloper;
  target: ArchitectTarget;
  domain: string;
  env: Record<string, string>;
}

export async function createArchitectDraft(input: ArchitectDraftInput): Promise<ArchitectRecord> {
  const db = await getDb();
  const now = new Date();
  const doc = {
    ...input,
    status: 'draft' as const,
    jobId: null,
    error: null,
    createdAt: now,
    updatedAt: now,
  };
  const res = await db.collection(Collections.ARCHITECTS).insertOne(doc);
  return { ...doc, _id: res.insertedId } as ArchitectRecord;
}

export async function getArchitectBySlug(slug: string): Promise<ArchitectRecord | null> {
  const db = await getDb();
  const doc = await db.collection(Collections.ARCHITECTS).findOne({ slug });
  return (doc as ArchitectRecord) ?? null;
}

export async function listArchitects(): Promise<ArchitectRecord[]> {
  const db = await getDb();
  const items = await db.collection(Collections.ARCHITECTS).find({}).sort({ createdAt: -1 }).toArray();
  return items as ArchitectRecord[];
}

export async function updateArchitectDraft(
  slug: string,
  patch: Partial<ArchitectDraftInput>,
): Promise<ArchitectRecord | null> {
  const db = await getDb();
  await db.collection(Collections.ARCHITECTS).updateOne({ slug }, { $set: { ...patch, updatedAt: new Date() } });
  return getArchitectBySlug(slug);
}

export async function setArchitectStatus(
  slug: string,
  status: ArchitectStatus,
  opts: { jobId?: string | null; error?: string | null } = {},
): Promise<void> {
  const db = await getDb();
  const set: Record<string, unknown> = { status, updatedAt: new Date() };
  if (opts.jobId !== undefined) set.jobId = opts.jobId;
  if (opts.error !== undefined) set.error = opts.error;
  await db.collection(Collections.ARCHITECTS).updateOne({ slug }, { $set: set });
}

export async function deleteArchitect(slug: string): Promise<void> {
  const db = await getDb();
  await db.collection(Collections.ARCHITECTS).deleteOne({ slug });
}
