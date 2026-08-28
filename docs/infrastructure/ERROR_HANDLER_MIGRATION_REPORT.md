# API Error Handler Migration Report

**Date:** 2025-10-02
**Total Endpoints Analyzed:** 104
**Endpoints with Catch Blocks:** 82

---

## Executive Summary

A comprehensive analysis of all API endpoints (`+server.ts` files) reveals that **37 endpoints** would benefit from migrating to the new centralized `handleApiError()` utility. Currently, most endpoints manually handle errors in catch blocks, which can lead to:

1. **Lost HTTP Status Codes**: Errors with specific status codes (401, 403, 404) are often converted to generic 500 errors
2. **Inconsistent Error Handling**: Different patterns across the codebase
3. **Code Duplication**: Similar error handling logic repeated in many files

### Current State

- ✅ **1 endpoint** already migrated (using `handleApiError`)
- ⚠️ **37 endpoints** would benefit from migration
- ⚠️ **1 endpoint** with critical issue (always returns 500)
- ℹ️ **16 endpoints** already using `error()` function correctly
- ℹ️ **45 endpoints** use other error patterns

---

## Priority Classification

### 🔴 HIGH PRIORITY (1 endpoint)

These files **always return 500** regardless of the error type, losing important HTTP status codes:

1. **`src/routes/api/pipelines/executions/[id]/events.csv/+server.ts`**
   - Issue: Returns `status: 500` for all errors
   - Impact: Client can't distinguish between auth errors, not found, etc.

### 🟡 MEDIUM PRIORITY (36 endpoints)

These files have error handling but could benefit from consistency and improved status code preservation:

#### Admin Endpoints (13 files)
- `src/routes/api/admin/clear-rate-limits/+server.ts`
- `src/routes/api/admin/feature-flags/code-files/+server.ts`
- `src/routes/api/admin/health/persistence/+server.ts`
- `src/routes/api/admin/migrate-credentials/+server.ts`
- `src/routes/api/admin/monitoring/db-calls/+server.ts`
- `src/routes/api/admin/monitoring/executions/+server.ts`
- `src/routes/api/admin/monitoring/test-mongo/+server.ts`
- `src/routes/api/admin/monitoring/test-postgres/+server.ts`
- `src/routes/api/admin/roles/+server.ts`
- `src/routes/api/admin/roles/[name]/+server.ts`
- `src/routes/api/admin/roles-metadata/+server.ts`
- `src/routes/api/admin/tags/+server.ts`
- `src/routes/api/admin/tags/[id]/+server.ts`

#### Credentials Endpoints (3 files)
- `src/routes/api/credentials/mongodb/+server.ts`
  - Note: Has manual status code checking (`error.message === 'Credential not found' ? 404 : 500`)
  - Would benefit from standardization
- `src/routes/api/credentials/postgres/+server.ts`
  - Similar manual status checking
- `src/routes/api/credentials/postgres/[credentialId]/tables/+server.ts`

#### Database Endpoints (4 files)
- `src/routes/api/postgres/columns/+server.ts`
- `src/routes/api/postgres/list-schemas/+server.ts`
- `src/routes/api/postgres/table-schema/+server.ts`
- `src/routes/api/postgres/write-data/+server.ts`

#### Slack Integration (4 files)
- `src/routes/api/slack/list-channels/+server.ts`
- `src/routes/api/slack/send-message/+server.ts`
- `src/routes/api/slack/test-connection/+server.ts`
- `src/routes/api/slack/test-webhook/+server.ts`

#### Other Endpoints (12 files)
- `src/routes/api/ai-agents/+server.ts` (3 catch blocks)
- `src/routes/api/auth/oauth/google/callback/+server.ts`
- `src/routes/api/auth/oauth/google/start/+server.ts`
- `src/routes/api/code/run/+server.ts`
- `src/routes/api/code-executions/+server.ts` (3 catch blocks)
- `src/routes/api/dev/loading-audit/+server.ts`
- `src/routes/api/health/redis/+server.ts`
- `src/routes/api/log-server/start/+server.ts`
- `src/routes/api/log-server/stop/+server.ts`
- `src/routes/api/pipeline-executions/+server.ts` (3 catch blocks)
- `src/routes/api/test/email/+server.ts`
- `src/routes/api/users/permissions/+server.ts`

### ✅ ALREADY CORRECT (16 endpoints)

These endpoints already use SvelteKit's `error()` function correctly and would primarily benefit from consistency:

- Auth endpoints (login, session management, etc.)
- Some admin endpoints
- Other scattered endpoints

---

## Common Error Handling Patterns Found

### Pattern 1: Generic 500 (Most Common)
```typescript
} catch (error: any) {
  console.error('Operation failed:', error);
  return json({
    success: false,
    error: 'Failed to perform operation'
  }, { status: 500 });
}
```
**Issue:** Loses specific error status codes

### Pattern 2: Manual Status Code Checking
```typescript
} catch (error: any) {
  console.error('Error:', error);
  const status = error.message === 'Credential not found' ? 404 : 500;
  return json({
    success: false,
    error: error.message || 'Failed to update credential'
  }, { status });
}
```
**Issue:** Fragile, depends on error message strings

### Pattern 3: Using error() Function (Best Current Practice)
```typescript
} catch (e) {
  throw error(500, 'Operation failed');
}
```
**Issue:** Still converts all errors to 500

---

## Benefits of Migration

### 1. Preserves HTTP Status Codes
```typescript
// BEFORE: Auth error becomes 500
try {
  await authenticateUser();
} catch (e) {
  return json({ error: 'Failed' }, { status: 500 });
}

// AFTER: Auth error stays 401
try {
  await authenticateUser(); // throws error(401, 'Unauthorized')
} catch (e) {
  handleApiError(e, 'Authentication failed'); // Re-throws 401
}
```

### 2. Centralized Error Logging
- All errors logged consistently
- Single place to add error tracking (Sentry, etc.)
- Easier to debug production issues

### 3. Reduced Code Duplication
- Fewer lines per endpoint
- Consistent error handling
- Easier to maintain

### 4. Better Client Experience
- Clients receive appropriate status codes
- Can handle 401, 403, 404 differently than 500
- Better error recovery logic

---

## Migration Guide

### Step 1: Import the Handler
```typescript
import { handleApiError } from '$lib/server/utils/errorHandler';
```

### Step 2: Replace Catch Blocks

**Before:**
```typescript
try {
  // ... your code
} catch (error: any) {
  console.error('Error in operation:', error);
  return json({
    success: false,
    error: error.message || 'Operation failed'
  }, { status: 500 });
}
```

**After:**
```typescript
try {
  // ... your code
} catch (e: any) {
  handleApiError(e, 'Operation failed');
}
```

### Step 3: Update Code That Throws Errors

Ensure your code throws SvelteKit errors with proper status codes:

```typescript
import { error } from '@sveltejs/kit';

// Instead of:
if (!user) {
  throw new Error('User not found');
}

// Use:
if (!user) {
  throw error(404, 'User not found');
}
```

---

## Testing Strategy

After migration, test each endpoint for:

1. **Successful requests** still work
2. **Authentication errors** return 401 (not 500)
3. **Not found errors** return 404 (not 500)
4. **Permission errors** return 403 (not 500)
5. **Validation errors** return 400 (not 500)
6. **Unexpected errors** return 500 with generic message

---

## Recommended Migration Order

1. **Phase 1 - Critical (1 endpoint)**
   - `src/routes/api/pipelines/executions/[id]/events.csv/+server.ts`

2. **Phase 2 - High Traffic (Estimate: 10 endpoints)**
   - Auth endpoints
   - Pipelines endpoints
   - Credentials endpoints

3. **Phase 3 - Admin (13 endpoints)**
   - All admin panel endpoints

4. **Phase 4 - Integrations (8 endpoints)**
   - Slack, MongoDB, Postgres endpoints

5. **Phase 5 - Remaining (5 endpoints)**
   - Test, dev, and miscellaneous endpoints

---

## Alternative: handleApiErrorAsJson()

For endpoints that prefer returning JSON directly:

```typescript
import { handleApiErrorAsJson } from '$lib/server/utils/errorHandler';

try {
  // ... your code
} catch (e: any) {
  return handleApiErrorAsJson(e, 'Operation failed');
}
```

This returns a `Response` object instead of throwing, useful for specific response patterns.

---

## Estimated Impact

- **Files to update:** 37
- **Catch blocks to replace:** ~80
- **Lines of code reduced:** ~150-200
- **Status code bugs fixed:** Unknown (depends on how many endpoints throw non-500 errors)
- **Estimated effort:** 2-4 hours (careful testing required)

---

## Conclusion

The new `handleApiError()` utility provides a consistent, maintainable way to handle errors across all API endpoints. The migration effort is modest, and the benefits include:

- ✅ Proper HTTP status code preservation
- ✅ Consistent error handling
- ✅ Reduced code duplication
- ✅ Better debugging capabilities
- ✅ Improved client error handling

**Recommendation:** Proceed with migration in phases, starting with the critical endpoint and high-traffic areas.
