# Double Encryption Bug - FIXED ✅

## The Problem

When saving/updating MongoDB credentials, the connection test would fail. However, manually pressing the "Test" button would succeed.

## Root Cause: Double Encryption

The bug was in `encryptMongoCredentialUpdates()` in `/src/lib/server/services/mongoCredentials.ts`.

### The Broken Flow (BEFORE FIX)

1. User loads an existing credential for editing
2. GET `/api/credentials/mongodb` returns credential with **decrypted** password: `myPassword123`
3. User makes a change (e.g., updates the name) but doesn't touch the password
4. The form still has the decrypted password value: `myPassword123`
5. User hits "Save"
6. PUT `/api/credentials/mongodb` sends the credential with decrypted password
7. `updateCredential()` is called
8. `encryptMongoCredentialUpdates()` **unconditionally encrypts** the password:
   - Input: `myPassword123` (plaintext)
   - Output: `enc:abc123...` (encrypted)
   - **BUT WAIT!** If the user didn't change the password, it's already decrypted from the DB
9. Password gets saved as `enc:abc123...`
10. Next time user loads the credential:
    - DB has: `enc:abc123...`
    - `findCredentialById()` tries to decrypt it
    - Decryption expects format: `enc:...`
    - Gets: `enc:abc123...` (single encryption) ✅
11. BUT if user saves again WITHOUT changing password:
    - Input to `encryptMongoCredentialUpdates`: `enc:abc123...` (already encrypted from last GET)
    - Encrypts it AGAIN: `enc:def456...` (DOUBLE ENCRYPTION!)
    - MongoDB tries to authenticate with: `enc:def456...` instead of real password
    - **Authentication FAILS** ❌

### Why Manual Test Button Works

When you press "Test" manually:
- It uses the password **currently in the form** (plaintext: `myPassword123`)
- Sends it directly to `/api/credentials/mongodb/test`
- Test endpoint uses it as-is without encryption
- **Test SUCCEEDS** ✅

When automatic test runs after save:
- Credential is saved with double-encrypted password
- Reloaded from DB, decrypted once: `enc:abc123...` (still encrypted!)
- Test tries to use: `enc:abc123...`
- **Test FAILS** ❌

## The Fix

Added a check to **prevent double encryption** in `encryptMongoCredentialUpdates()`:

###  Before:
```typescript
if ('password' in encrypted && encrypted.password) {
  encrypted.password = encryptSecret(encrypted.password) || '';  // Always encrypts!
}
```

### After:
```typescript
if ('password' in encrypted && encrypted.password) {
  // Only encrypt if password doesn't already start with 'enc:'
  if (!encrypted.password.startsWith('enc:')) {
    encrypted.password = encryptSecret(encrypted.password) || '';
  }
}
```

## Files Changed

`/src/lib/server/services/mongoCredentials.ts`:
- Line 316-318: Added check for main password
- Line 327-329: Added check for SSH password
- Line 335-337: Added check for SSH passphrase

## Impact

This fix prevents:
1. **Double encryption** when updating credentials without changing the password
2. **Authentication failures** after saving credentials
3. **Confusion** where manual test works but saved credential doesn't

## How to Verify the Fix

1. Create a new MongoDB credential
2. Save it successfully
3. Edit the credential (change name, don't touch password)
4. Save again
5. Test the credential
6. ✅ Should work (previously would fail)

## Related Issues

This is related to the earlier fix in `MONGODB_AUTH_FIX_COMPLETE.md` where the AI Pipeline Generator was using `getAllCredentials()` (which returns encrypted passwords) instead of `findCredentialById()` (which returns decrypted passwords).

Both issues stem from improper handling of the encryption/decryption lifecycle.
