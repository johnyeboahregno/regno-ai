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

export interface ArchitectServiceTelemetry {
  name: string;
  online: boolean;
  detail?: string;
}

/** A single step in a provisioning run, shown live in the wizard. */
export interface ArchitectProgressStep {
  stage: string;
  label: string;
  at: Date;
}

/** Latest telemetry snapshot, denormalized onto the architect record for fast listing. */
export interface ArchitectTelemetrySummary {
  status: 'healthy' | 'degraded' | 'error';
  version: string;
  uptimeSeconds: number;
  memPercent: number;
  services: ArchitectServiceTelemetry[];
  receivedAt: Date;
}

export interface ArchitectTelemetryRecord {
  slug: string;
  configDocId: string;
  /** Full Regno Standard document set from the last heartbeat (see packages/shared). */
  docs: Record<string, unknown>[];
  summary: ArchitectTelemetrySummary;
  receivedAt: Date;
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
  progress?: ArchitectProgressStep[] | null;
  lastSeenAt?: Date | null;
  online?: boolean | null;
  telemetry?: ArchitectTelemetrySummary | null;
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
    progress: [],
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
  // Fresh provisioning run → clear any previous run's progress log.
  if (status === 'provisioning') set.progress = [];
  await db.collection(Collections.ARCHITECTS).updateOne({ slug }, { $set: set });
}

/** Append a step to the Architect's provisioning progress log (for the wizard). */
export async function appendArchitectProgress(
  slug: string,
  step: Omit<ArchitectProgressStep, 'at'>,
): Promise<void> {
  const db = await getDb();
  await db.collection(Collections.ARCHITECTS).updateOne(
    { slug },
    { $push: { progress: { ...step, at: new Date() } }, $set: { updatedAt: new Date() } },
  );
}

export async function deleteArchitect(slug: string): Promise<void> {
  const db = await getDb();
  await db.collection(Collections.ARCHITECTS).deleteOne({ slug });
  await db.collection(Collections.ARCHITECT_TELEMETRY).deleteOne({ slug });
}

/**
 * Persist an Architect heartbeat: store the full Regno Standard document set in
 * `architect_telemetry` and denormalize the summary onto the architect record so
 * the Mothership list page can show live status without a second query.
 */
export async function recordArchitectTelemetry(
  slug: string,
  input: { configDocId: string; docs: Record<string, unknown>[]; summary: Omit<ArchitectTelemetrySummary, 'receivedAt'> },
): Promise<void> {
  const db = await getDb();
  const now = new Date();
  const record: ArchitectTelemetryRecord = {
    slug,
    configDocId: input.configDocId,
    docs: input.docs,
    summary: { ...input.summary, receivedAt: now },
    receivedAt: now,
  };
  await db.collection(Collections.ARCHITECT_TELEMETRY).updateOne(
    { slug },
    { $set: record },
    { upsert: true },
  );
  await db.collection(Collections.ARCHITECTS).updateOne(
    { slug },
    {
      $set: {
        lastSeenAt: now,
        online: true,
        telemetry: { ...input.summary, receivedAt: now },
        updatedAt: now,
      },
    },
  );
}

/** Fetch the latest stored Regno Standard telemetry bundle for an Architect. */
export async function getArchitectTelemetry(slug: string): Promise<ArchitectTelemetryRecord | null> {
  const db = await getDb();
  const doc = await db.collection(Collections.ARCHITECT_TELEMETRY).findOne({ slug });
  return (doc as unknown as ArchitectTelemetryRecord) ?? null;
}

/**
 * Flip `online` → false for Architects whose last heartbeat is older than
 * `maxAgeMs`. Returns the number of Architects marked offline.
 */
export async function markStaleArchitectsOffline(maxAgeMs: number): Promise<number> {
  const db = await getDb();
  const cutoff = new Date(Date.now() - maxAgeMs);
  const res = await db.collection(Collections.ARCHITECTS).updateMany(
    { online: true, lastSeenAt: { $lt: cutoff } },
    { $set: { online: false, updatedAt: new Date() } },
  );
  return res.modifiedCount;
}
