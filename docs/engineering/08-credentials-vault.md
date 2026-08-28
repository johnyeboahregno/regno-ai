# Credentials Vault

> Status: stable · Last updated: 2026-08-28

## What it is

Encrypted-at-rest service credentials (AES-256-GCM) in the Mongo `credentials` collection.

## Why

Mirror regno.ai's `credentials` collection (docs/DB_SCHEMA.md §2.1) — secrets never stored plaintext.

## How it works

- `packages/crypto/src/index.ts` — `encryptSecret`/`decryptSecret` (AES-256-GCM).
  Key = `CREDENTIALS_KEY` (64 hex) if set, else scrypt-derived from `JWT_SECRET`.
- `packages/db/src/credentials.ts` — `storeCredential`, `listCredentials` (no secrets),
  `revealCredential`, `deleteCredential`.
- API: `GET/POST /api/credentials`, `GET/DELETE /api/credentials/[id]` (session-protected).

## Files involved

- `packages/crypto/src/index.ts`
- `packages/db/src/credentials.ts`
- `apps/web/src/routes/api/credentials/**`

## Reproduce / verify

```bash
regno credentials add --name openai --type api --secret sk-...
regno credentials list          # names only, no secrets
regno credentials reveal openai # decrypted value
```
