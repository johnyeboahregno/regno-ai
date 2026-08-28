# Event Object Bug - FIXED ✅

## The Problem

When saving a MongoDB credential, the connection test would fail with a 400 Bad Request error:
```
POST http://fakedomain.com:5173/api/credentials/mongodb/test 400 (Bad Request)
```

Server logs showed the API was receiving a browser Event object instead of credential data:
```
[MongoDB Test] Received credential: {
  host: undefined,
  port: undefined,
  database: undefined,
  username: undefined,
  hasPassword: false,
  passwordPrefix: 'none',
  authSource: undefined,
  useSSL: undefined
}
[MongoDB Test] Missing required fields: {
  host: undefined,
  database: undefined,
  allFields: [ 'isTrusted' ]  // <-- Browser Event object!
}
```

## Root Cause: Click Event Passed Instead of Credential Data

The bug was in MongoCredentialForm.svelte where the Save/Test button's onclick handler was incorrectly wired.

### The Broken Flow (BEFORE FIX)

1. User fills in MongoDB credential form
2. User clicks "Save" button
3. Button has: `onclick={onTestMongoConnection}`
4. This directly binds the click event to the callback
5. When clicked, Svelte calls: `onTestMongoConnection(clickEvent)`
6. The `clickEvent` is a browser MouseEvent object with properties like `isTrusted`, `target`, etc.
7. This MouseEvent object gets passed through the entire chain:
   - MongoCredentialForm → CredentialsPanel → DataManagementCanvas → CredentialsManager
8. Eventually reaches API call: `mongoCredentialsService.testConnection(clickEvent)`
9. API receives `{ isTrusted: true }` instead of `{ host, port, database, username, password, ... }`
10. **Test FAILS** with 400 Bad Request ❌

### Why This Wasn't Caught Earlier

The TypeScript interface was incorrect:
```typescript
// BEFORE (WRONG):
onTestMongoConnection: () => Promise<void>;  // Says it takes NO parameters
```

But the actual function being passed required parameters:
```typescript
function handleTestAndSaveMongo(config: any, credentialId: string | null) {
  dispatch('test-and-save-mongo', { config, credentialId });
}
```

TypeScript didn't catch this because:
1. The interface said "no parameters"
2. The button binding didn't show parameter passing
3. At runtime, JavaScript happily accepted the click event as the first parameter

## The Fix

### 1. Fixed the Interface (Line 6-14 in MongoCredentialForm.svelte)

**Before:**
```typescript
interface Props {
  editedConfig: any;
  isTestingConnection: boolean;
  connectionPings: string[];
  onTestMongoConnection: () => Promise<void>;  // WRONG: Takes no parameters
  showTitle?: boolean;
  onClose?: () => void;
  editingCredentialId?: string | null;
}
```

**After:**
```typescript
interface Props {
  editedConfig: any;
  isTestingConnection: boolean;
  connectionPings: string[];
  onTestMongoConnection: (config: any, credentialId: string | null) => Promise<void> | void;  // CORRECT
  showTitle?: boolean;
  onClose?: () => void;
  editingCredentialId?: string | null;
}
```

### 2. Fixed the Button Click Handler (Line 590-604 in MongoCredentialForm.svelte)

**Before:**
```svelte
<button
  class="..."
  onclick={onTestMongoConnection}  <!-- WRONG: Passes click event -->
  disabled={isTestingConnection}
>
```

**After:**
```svelte
<button
  class="..."
  onclick={() => onTestMongoConnection(editedConfig.newMongoCredential, editingCredentialId)}  <!-- CORRECT -->
  disabled={isTestingConnection}
>
```

## How It Works Now (AFTER FIX)

1. User fills in MongoDB credential form
2. User clicks "Save" button
3. Button has: `onclick={() => onTestMongoConnection(editedConfig.newMongoCredential, editingCredentialId)}`
4. Arrow function ignores the click event and calls callback with credential data
5. Callback receives: `({ host: 'localhost', port: 27017, database: 'mydb', username: 'user', password: 'pass123', ... }, null)`
6. This data flows through the chain correctly:
   - MongoCredentialForm → CredentialsPanel → DataManagementCanvas → CredentialsManager
7. Reaches API call: `mongoCredentialsService.testConnection({ host, port, database, ... })`
8. API receives proper credential object
9. **Test SUCCEEDS** ✅

## Files Changed

`/disks/disk1/chat/src/lib/components/MongoCredentialForm.svelte`:
- Lines 6-14: Fixed interface to accept `(config, credentialId)` parameters
- Line 594: Changed from `onclick={onTestMongoConnection}` to `onclick={() => onTestMongoConnection(editedConfig.newMongoCredential, editingCredentialId)}`

## Impact

This fix ensures:
1. **Proper data passing**: Credential object is passed instead of browser Event object
2. **Type safety**: Interface now correctly describes the callback signature
3. **Successful testing**: Connection tests work when saving credentials
4. **Better error messages**: If test fails, it's now due to actual connection issues, not malformed data

## How to Verify the Fix

1. Open MongoDB credentials panel in the app
2. Fill in a MongoDB credential (or edit an existing one)
3. Click "Save"
4. ✅ Should test connection with actual credential data
5. ✅ Should save successfully if connection succeeds
6. ✅ Should show proper error message if connection fails (e.g., "Authentication failed" not "Missing required fields")

## Related Issues

This bug was discovered while investigating the double encryption bug (see `DOUBLE_ENCRYPTION_BUG_FIX.md`). The double encryption issue caused tests to fail even after this fix, which is why both bugs needed to be fixed together.

## Lesson Learned

**Always use arrow functions for event handlers when you need to pass custom parameters:**

❌ **WRONG:**
```svelte
<button onclick={handleClick}>Click me</button>
<!-- handleClick receives the MouseEvent object -->
```

✅ **CORRECT:**
```svelte
<button onclick={() => handleClick(myData, myId)}>Click me</button>
<!-- handleClick receives myData and myId, MouseEvent is ignored -->
```

This pattern prevents browser events from being accidentally passed as data to API calls.
