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
