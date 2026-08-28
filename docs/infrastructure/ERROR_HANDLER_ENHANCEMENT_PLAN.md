# Enhanced Error Handler Implementation Plan

## Problem Analysis

Currently, endpoints handle errors in inconsistent ways:
```typescript
// Pattern 1: Manual catch returning 500
} catch (e: any) {
  return json({ error: e.message }, { status: 500 });
}

// Pattern 2: Using SvelteKit's error() but still in catch
} catch (e: any) {
  throw error(500, e.message);
}
```

**Issue:** When code throws `error(401, 'Unauthorized')` or `error(404, 'Not found')`, the catch block converts it to a generic 500.

## Solution Options

### ❌ Option 1: Override SvelteKit's `error()` Function
**Approach:** Create a wrapper that intercepts all `error()` calls
```typescript
// Custom error wrapper
export function error(status: number, message: string) {
  // Custom logic here
  return svelteKitError(status, message);
}
```

**Problems:**
- ❌ SvelteKit's `error()` throws an `HttpError` object, not a regular Error
- ❌ Can't override module exports in JavaScript/TypeScript
- ❌ Would require changing all imports from `@sveltejs/kit` to custom module
- ❌ Breaks SvelteKit's internal error handling flow
- ❌ Not maintainable - would need to track SvelteKit updates

**Verdict:** NOT RECOMMENDED

---

### ❌ Option 2: Use SvelteKit's `handleError` Hook
**Approach:** Implement `handleError` in `hooks.server.ts`
```typescript
export async function handleError({ error, event }) {
  // Custom error handling
  return { message: error.message };
}
```

**Problems:**
- ❌ `handleError` only runs for **unexpected** errors (500s)
- ❌ Does NOT run for errors thrown via `error()` function (4xx errors)
- ❌ Can't change status codes in `handleError` hook
- ❌ Wrong tool for the job

**Verdict:** NOT SUITABLE for this use case

---

### ✅ Option 3: Smart Catch Block Handler (RECOMMENDED)

**Approach:** Keep the current `handleApiError()` utility but enhance it

The key insight: **SvelteKit's `error()` function throws an `HttpError` object with a `status` property**

```typescript
// Enhanced error handler
export function handleApiError(e: any, fallbackMessage = 'Internal server error'): never {
  // Check if it's already a SvelteKit HttpError with status
  if (e && typeof e === 'object' && 'status' in e && typeof e.status === 'number') {
    // Re-throw to preserve the original error
    throw e;
  }

  // For all other errors, return generic 500
  console.error('[API Error]', fallbackMessage, e);
  throw error(500, { message: e?.message || fallbackMessage });
}
```

**Benefits:**
- ✅ No changes to SvelteKit's error handling
- ✅ Works with existing code
- ✅ Preserves status codes from `error(4xx, message)` calls
- ✅ Simple to implement and test
- ✅ Backwards compatible
- ✅ Easy to rollback if needed

**Verdict:** RECOMMENDED

---

### ✅ Option 4: Create Custom Error Utilities (COMPLEMENTARY)

**Approach:** Provide helper functions that make it easier to throw typed errors

```typescript
// src/lib/server/utils/apiErrors.ts
export const ApiError = {
  unauthorized: (message = 'Unauthorized') => error(401, message),
  forbidden: (message = 'Forbidden') => error(403, message),
  notFound: (message = 'Not found') => error(404, message),
  badRequest: (message = 'Bad request') => error(400, message),
  conflict: (message = 'Conflict') => error(409, message),
  internal: (message = 'Internal server error') => error(500, message)
};

// Usage in endpoints
if (!user) throw ApiError.notFound('User not found');
if (!hasPermission) throw ApiError.forbidden('Insufficient permissions');
```

**Benefits:**
- ✅ Type-safe error throwing
- ✅ Consistent error messages
- ✅ Self-documenting code
- ✅ Works perfectly with `handleApiError()`

**Verdict:** RECOMMENDED as complementary feature

---

## Recommended Implementation Plan

### Phase 1: Enhance Current Error Handler ✅
**File:** `src/lib/server/utils/errorHandler.ts`

**Current Implementation (already created):**
```typescript
export function handleApiError(e: any, fallbackMessage = 'Internal server error'): never {
  if (isSvelteKitError(e)) {
    throw e;  // Preserve original error
  }
  throw error(500, { message });
}
```

**Enhancement Needed:**
- Improve the `isSvelteKitError()` check to handle all SvelteKit error types
- Add better logging
- Add optional error transformation

### Phase 2: Create Error Utility Helpers 🆕
**File:** `src/lib/server/utils/apiErrors.ts`

Create typed error helpers for common HTTP status codes:
```typescript
import { error } from '@sveltejs/kit';

/**
 * Type-safe API error utilities for common HTTP status codes
 */
export const ApiError = {
  // 4xx Client Errors
  badRequest: (message = 'Bad request') =>
    error(400, { message }),

  unauthorized: (message = 'Unauthorized') =>
    error(401, { message }),

  forbidden: (message = 'Access forbidden') =>
    error(403, { message }),

  notFound: (message = 'Resource not found') =>
    error(404, { message }),

  conflict: (message = 'Resource conflict') =>
    error(409, { message }),

  unprocessable: (message = 'Unprocessable entity') =>
    error(422, { message }),

  tooManyRequests: (message = 'Too many requests') =>
    error(429, { message }),

  // 5xx Server Errors
  internal: (message = 'Internal server error') =>
    error(500, { message }),

  notImplemented: (message = 'Not implemented') =>
    error(501, { message }),

  serviceUnavailable: (message = 'Service unavailable') =>
    error(503, { message }),

  // Custom error with any status
  custom: (status: number, message: string) =>
    error(status, { message })
};

// Type helper for checking error types
export function isApiError(e: unknown): e is { status: number; body: { message: string } } {
  return (
    typeof e === 'object' &&
    e !== null &&
    'status' in e &&
    typeof (e as any).status === 'number' &&
    (e as any).status >= 400 &&
    (e as any).status < 600
  );
}
```

### Phase 3: Update Example Endpoints 📝
**Goal:** Show the pattern in action

**Example 1:** Simple CRUD endpoint
```typescript
// src/routes/api/example/+server.ts
import { json } from '@sveltejs/kit';
import { handleApiError } from '$lib/server/utils/errorHandler';
import { ApiError } from '$lib/server/utils/apiErrors';

export const GET = async ({ locals }) => {
  try {
    // Use ApiError helpers for explicit errors
    if (!locals.user) {
      throw ApiError.unauthorized('Please log in');
    }

    if (!locals.user.hasPermission('read:data')) {
      throw ApiError.forbidden('Insufficient permissions');
    }

    const data = await fetchData();
    if (!data) {
      throw ApiError.notFound('Data not found');
    }

    return json({ success: true, data });

  } catch (e: any) {
    // handleApiError preserves status codes from ApiError helpers
    handleApiError(e, 'Failed to fetch data');
  }
};
```

**Example 2:** With validation
```typescript
export const POST = async ({ request, locals }) => {
  try {
    if (!locals.user) throw ApiError.unauthorized();

    const body = await request.json();

    // Validate request
    if (!body.name) {
      throw ApiError.badRequest('Name is required');
    }

    if (await isDuplicate(body.name)) {
      throw ApiError.conflict('Name already exists');
    }

    const result = await createResource(body);
    return json({ success: true, result });

  } catch (e: any) {
    handleApiError(e, 'Failed to create resource');
  }
};
```

### Phase 4: Migration Guide 📚
**File:** Update `ERROR_HANDLER_MIGRATION_REPORT.md`

Add section on using the new utilities:

```markdown
## Migration Examples

### Before:
```typescript
try {
  if (!user) {
    return json({ error: 'User not found' }, { status: 404 });
  }
} catch (e) {
  return json({ error: e.message }, { status: 500 });
}
```

### After:
```typescript
import { handleApiError } from '$lib/server/utils/errorHandler';
import { ApiError } from '$lib/server/utils/apiErrors';

try {
  if (!user) {
    throw ApiError.notFound('User not found');
  }
} catch (e: any) {
  handleApiError(e, 'Operation failed');
}
```
```

### Phase 5: Testing Strategy 🧪

**Test Cases:**
1. ✅ `ApiError.unauthorized()` → Returns 401 to client
2. ✅ `ApiError.forbidden()` → Returns 403 to client
3. ✅ `ApiError.notFound()` → Returns 404 to client
4. ✅ `ApiError.badRequest()` → Returns 400 to client
5. ✅ Generic Error → Returns 500 to client
6. ✅ Database error → Returns 500 to client
7. ✅ Network error → Returns 500 to client

**Test File:** `src/lib/server/utils/errorHandler.test.ts`

---

## Implementation Steps

### Step 1: Enhance errorHandler.ts ✅
- Already created, just needs verification
- Current implementation should work correctly

### Step 2: Create apiErrors.ts 🆕
- Create the helper utilities file
- Export `ApiError` object with methods
- Export `isApiError()` type guard

### Step 3: Update 2-3 Example Endpoints 📝
- Pick diverse examples (auth, CRUD, complex logic)
- Show before/after comparisons
- Demonstrate best practices

### Step 4: Document Pattern 📚
- Update migration report
- Add code examples
- Create quick reference guide

### Step 5: Validate with Tests 🧪
- Manual testing of example endpoints
- Verify status codes are preserved
- Check error messages are appropriate

---

## Why This Approach is Better

### Compared to Overriding SvelteKit's error()
| Aspect | Override `error()` | Our Approach |
|--------|-------------------|--------------|
| Compatibility | ❌ Breaks SvelteKit | ✅ Works with SvelteKit |
| Maintenance | ❌ High (track updates) | ✅ Low |
| Import changes | ❌ All files | ✅ None required |
| Testing | ❌ Complex | ✅ Simple |
| Rollback | ❌ Difficult | ✅ Easy |

### Benefits Over Current State
- ✅ Consistent error handling across all endpoints
- ✅ Preserves HTTP status codes (401, 403, 404, etc.)
- ✅ Type-safe error throwing
- ✅ Better developer experience
- ✅ Centralized error logging
- ✅ Easy to add error tracking (Sentry, etc.)

### Developer Experience Improvements
```typescript
// OLD WAY - Manual status codes everywhere
if (!user) {
  return json({ success: false, error: 'Unauthorized' }, { status: 401 });
}

// NEW WAY - Clean and expressive
if (!user) {
  throw ApiError.unauthorized('Please log in');
}
```

---

## Files to Create/Modify

### New Files:
1. ✅ `src/lib/server/utils/errorHandler.ts` (already exists)
2. 🆕 `src/lib/server/utils/apiErrors.ts` (to create)

### Files to Update:
3. 📝 `src/routes/api/pipelines/+server.ts` (example - already done)
4. 📝 `src/routes/api/auth/login/+server.ts` (example - show pattern)
5. 📝 `ERROR_HANDLER_MIGRATION_REPORT.md` (add new utilities section)

### Optional:
6. 🧪 `src/lib/server/utils/errorHandler.test.ts` (if using testing framework)

---

## Rollout Strategy

### Phase 1: Foundation (Day 1)
- Create `apiErrors.ts` utilities
- Verify `errorHandler.ts` works correctly
- Document the pattern

### Phase 2: Examples (Day 1-2)
- Update 2-3 high-visibility endpoints
- Create before/after examples
- Test thoroughly

### Phase 3: Communication (Day 2)
- Update documentation
- Share examples with team
- Create migration guide

### Phase 4: Gradual Migration (Ongoing)
- Update endpoints as they're touched
- Focus on high-traffic routes first
- No rush - can coexist with old patterns

---

## Success Metrics

- ✅ Status codes properly preserved (4xx stay 4xx)
- ✅ Error messages are appropriate (not leaking sensitive info)
- ✅ Code is more readable and maintainable
- ✅ Developer experience is improved
- ✅ No breaking changes to existing behavior

---

## Conclusion

**Recommended Approach:**
- ✅ **Option 3** - Enhanced catch block handler (already implemented)
- ✅ **Option 4** - Custom error utilities (complement Option 3)

**NOT Recommended:**
- ❌ Overriding SvelteKit's `error()` function
- ❌ Using `handleError` hook for this purpose

**Next Steps:**
1. Create `apiErrors.ts` utility file
2. Update 2-3 example endpoints to demonstrate pattern
3. Document best practices
4. Gradually migrate endpoints over time

This approach is **safe, maintainable, and backwards compatible** while significantly improving error handling consistency.
