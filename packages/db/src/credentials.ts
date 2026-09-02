/**
 * Credentials vault — encrypted service credentials (docs/DB_SCHEMA.md §2.1).
 * Secrets are AES-256-GCM encrypted before hitting MongoDB (`credentials`).
 */
import { ObjectId } from 'mongodb';
import { getDb } from './mongo.js';
import { Collections } from '@regno/shared';
import { encryptSecret, decryptSecret } from '@regno/crypto';

export interface CredentialInput {
  name: string;
  type: string;
  provider?: string;
  secret: string;
}

export interface CredentialSummary {
  id: string;
  name: string;
  type: string;
  provider: string;
  createdAt: Date;
}

export async function storeCredential(input: CredentialInput): Promise<string> {
  const db = await getDb();
  const now = new Date();
  const res = await db.collection(Collections.CREDENTIALS).insertOne({
    name: input.name,
    type: input.type,
    provider: input.provider ?? input.type,
    encryptedValue: encryptSecret(input.secret),
    createdAt: now,
  });
  return String(res.insertedId);
}

/** Find a credential id by its unique name (null when absent). */
export async function findCredentialByName(name: string): Promise<string | null> {
  const db = await getDb();
  const doc = await db.collection(Collections.CREDENTIALS).findOne({ name }, { projection: { _id: 1 } });
  return doc ? String(doc._id) : null;
}

/** List credentials without their secrets. */
export async function listCredentials(): Promise<CredentialSummary[]> {
  const db = await getDb();
  const items = await db.collection(Collections.CREDENTIALS).find({}, { projection: { encryptedValue: 0 } }).toArray();
  return items.map((i) => ({
    id: String(i._id),
    name: String(i.name),
    type: String(i.type),
    provider: String(i.provider ?? ''),
    createdAt: i.createdAt as Date,
  }));
}

/** Reveal a decrypted secret by credential id. */
export async function revealCredential(id: string): Promise<string | null> {
  const db = await getDb();
  const doc = await db.collection(Collections.CREDENTIALS).findOne({ _id: new ObjectId(id) });
  if (!doc?.encryptedValue) return null;
  return decryptSecret(String(doc.encryptedValue));
}

export async function deleteCredential(id: string): Promise<void> {
  const db = await getDb();
  await db.collection(Collections.CREDENTIALS).deleteOne({ _id: new ObjectId(id) });
}

/** Create or replace a credential by its unique name (used for architect env blobs). */
export async function upsertCredentialByName(
  name: string,
  input: Omit<CredentialInput, 'name'>,
): Promise<string> {
  const db = await getDb();
  const existing = await db.collection(Collections.CREDENTIALS).findOne({ name }, { projection: { _id: 1 } });
  const now = new Date();
  const doc = {
    type: input.type,
    provider: input.provider ?? input.type,
    encryptedValue: encryptSecret(input.secret),
  };
  if (existing) {
    await db.collection(Collections.CREDENTIALS).updateOne({ _id: existing._id }, { $set: { ...doc, updatedAt: now } });
    return String(existing._id);
  }
  const res = await db.collection(Collections.CREDENTIALS).insertOne({ name, ...doc, createdAt: now });
  return String(res.insertedId);
}

/** Reveal a decrypted secret by credential name (null when absent). */
export async function revealCredentialByName(name: string): Promise<string | null> {
  const db = await getDb();
  const doc = await db.collection(Collections.CREDENTIALS).findOne({ name });
  if (!doc?.encryptedValue) return null;
  return decryptSecret(String(doc.encryptedValue));
}

/** Delete a credential by its unique name (idempotent). */
export async function deleteCredentialByName(name: string): Promise<void> {
  const db = await getDb();
  await db.collection(Collections.CREDENTIALS).deleteOne({ name });
}
