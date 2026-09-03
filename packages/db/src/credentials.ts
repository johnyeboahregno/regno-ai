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

export const LLM_API_KEY_SETTINGS = [
  {
    name: 'OPENAI_API_KEY',
    label: 'OpenAI',
    provider: 'openai',
    envAliases: [] as string[],
  },
  {
    name: 'ANTHROPIC_API_KEY',
    label: 'Anthropic',
    provider: 'anthropic',
    envAliases: [] as string[],
  },
  {
    name: 'GOOGLE_AI_API_KEY',
    label: 'Google AI Studio',
    provider: 'google',
    envAliases: ['GOOGLE_API_KEY'],
  },
  {
    name: 'DEEPSEEK_API_KEY',
    label: 'DeepSeek',
    provider: 'deepseek',
    envAliases: [] as string[],
  },
] as const;

export type LlmApiKeyName = (typeof LLM_API_KEY_SETTINGS)[number]['name'];

export interface LlmApiKeyStatus {
  name: LlmApiKeyName;
  label: string;
  provider: string;
  configured: boolean;
  source: 'vault' | 'env' | 'none';
  updatedAt?: Date;
  createdAt?: Date;
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

function llmCredentialName(name: LlmApiKeyName): string {
  return `llm:${name}`;
}

function isLlmApiKeyName(name: string): name is LlmApiKeyName {
  return LLM_API_KEY_SETTINGS.some((setting) => setting.name === name);
}

export async function listLlmApiKeySettings(): Promise<LlmApiKeyStatus[]> {
  const db = await getDb();
  const names = LLM_API_KEY_SETTINGS.map((setting) => llmCredentialName(setting.name));
  const docs = await db
    .collection(Collections.CREDENTIALS)
    .find({ name: { $in: names } }, { projection: { name: 1, createdAt: 1, updatedAt: 1 } })
    .toArray();
  const byName = new Map(docs.map((doc) => [String(doc.name), doc]));

  return LLM_API_KEY_SETTINGS.map((setting) => {
    const doc = byName.get(llmCredentialName(setting.name));
    const envValue = process.env[setting.name] || setting.envAliases.some((alias) => !!process.env[alias]);
    return {
      name: setting.name,
      label: setting.label,
      provider: setting.provider,
      configured: !!doc || !!envValue,
      source: doc ? 'vault' : envValue ? 'env' : 'none',
      createdAt: doc?.createdAt as Date | undefined,
      updatedAt: doc?.updatedAt as Date | undefined,
    };
  });
}

export async function saveLlmApiKeySettings(keys: Partial<Record<LlmApiKeyName, string>>): Promise<void> {
  for (const [name, value] of Object.entries(keys)) {
    if (!isLlmApiKeyName(name)) continue;
    const secret = String(value ?? '').trim();
    if (!secret) {
      await deleteCredentialByName(llmCredentialName(name));
      delete process.env[name];
      const setting = LLM_API_KEY_SETTINGS.find((candidate) => candidate.name === name);
      for (const alias of setting?.envAliases ?? []) delete process.env[alias];
      continue;
    }

    const setting = LLM_API_KEY_SETTINGS.find((candidate) => candidate.name === name);
    await upsertCredentialByName(llmCredentialName(name), {
      type: 'llm_api_key',
      provider: setting?.provider ?? 'llm',
      secret,
    });
    process.env[name] = secret;
    for (const alias of setting?.envAliases ?? []) process.env[alias] = secret;
  }
}

export async function hydrateLlmApiKeysFromVault(): Promise<void> {
  for (const setting of LLM_API_KEY_SETTINGS) {
    const secret = await revealCredentialByName(llmCredentialName(setting.name));
    if (!secret) continue;
    process.env[setting.name] = secret;
    for (const alias of setting.envAliases) process.env[alias] = secret;
  }
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
