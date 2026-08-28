# MongoDB Authentication Bug - FIXED ✅

## The Problem

The AI Pipeline Generator was failing with MongoDB authentication errors:
```
[Pipeline Generator] Error: MongoServerError: Authentication failed.
```

**BUT** the same credential worked perfectly for chart nodes!

## Root Cause

The issue was **password encryption/decryption**:

### What Chart Nodes Do (✅ Works)
```typescript
// src/lib/server/execution/pipelineGraphRunner.ts line 1835
const cred = credId ? await getMongoCredentialById(credId) : null;
```

Which calls:
```typescript
// src/lib/server/credentialStore.ts line 11-18
export async function getMongoCredentialById(id: string) {
  const credential = await mongoCredentialsStorage.findCredentialById<StoredMongoCredential>(id);
  // ☝️ findCredentialById() DECRYPTS the password (line 273-303 in mongoCredentials.ts)
  return mongoCredential;
}
```

### What AI Pipeline Generator Did (❌ Failed)
```typescript
// src/routes/api/datasource/generate-pipeline/+server.ts line 34-35 (BEFORE FIX)
const creds = await mongoCredentialsStorage.getAllCredentials();
const cred = creds.find(c => c.id === credentialId);
// ☝️ getAllCredentials() does NOT decrypt passwords! (line 224-232 in mongoCredentials.ts)
```

## The Fix

Changed the AI Pipeline Generator to use the same decryption method as chart nodes:

```typescript
// src/routes/api/datasource/generate-pipeline/+server.ts line 33-39 (AFTER FIX)
const cred = await mongoCredentialsStorage.findCredentialById(credentialId);

if (!cred || cred.type !== 'mongodb') {
  console.error('[Pipeline Generator] MongoDB credential not found');
  throw svelteError(404, 'MongoDB credential not found');
}
```

## Why This Happened

MongoDB credentials are stored encrypted in the database:
- **Encrypted format**: `enc:a1b2c3d4...` (stored in DB)
- **Decrypted format**: `actualPassword123` (needed for MongoDB connection)

The codebase has two methods:
1. `findCredentialById()` - Returns credential with **decrypted password** ✅
2. `getAllCredentials()` - Returns credentials with **encrypted passwords** ❌

Chart nodes used method #1, so they got decrypted passwords and could authenticate.
AI Pipeline Generator used method #2, so it got encrypted passwords and failed to authenticate.

MongoDB rejected the connection because it was trying to authenticate with `enc:a1b2c3d4...` instead of the actual password.

## Files Changed

1. `/disks/disk1/chat/src/routes/api/datasource/generate-pipeline/+server.ts`
   - Changed from `getAllCredentials()` to `findCredentialById()`
   - Simplified credential lookup logic
   - Added type checking for MongoDB credentials

## Testing

To verify the fix works:
1. Open your app and navigate to a Data Source node
2. Configure it with a MongoDB credential
3. Click "Generate AI-Optimised Pipelines"
4. It should now successfully connect to MongoDB and generate pipeline suggestions

## Lesson Learned

Always use `findCredentialById()` or the wrapper function `getMongoCredentialById()` when you need to **use** a credential for actual database connections. These methods properly decrypt sensitive fields.

Only use `getAllCredentials()` for listing/displaying credentials in the UI where you don't need the actual passwords.
