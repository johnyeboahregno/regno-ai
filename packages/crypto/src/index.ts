/**
 * AES-256-GCM secret encryption for the credentials vault
 * (mirrors docs/DB_SCHEMA.md §2.1 — `credentials` collection stores
 * encrypted service credentials).
 *
 * Key source (first match):
 *   1. CREDENTIALS_KEY env — 64 hex chars (32 bytes)
 *   2. derived via scrypt from JWT_SECRET (or a dev default)
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

function getKey(): Buffer {
  const raw = process.env.CREDENTIALS_KEY;
  if (raw && /^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  const base = process.env.JWT_SECRET ?? 'dev-master-key';
  return scryptSync(base, 'regno-credentials-v1', 32);
}

/** Encrypt a secret → "iv:tag:ciphertext" (hex). */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('hex'), tag.toString('hex'), enc.toString('hex')].join(':');
}

/** Decrypt a "iv:tag:ciphertext" payload back to the plaintext secret. */
export function decryptSecret(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(':');
  if (!ivHex || !tagHex || !dataHex) throw new Error('Malformed encrypted credential');
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
}
