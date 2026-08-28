# Remaining Endpoints - Error Handler Migration Report

**Generated:** 2025-10-02
**Total API Endpoints:** 104
**Already Migrated:** 36
**Remaining to Review:** 68

---

## 📊 Executive Summary

Out of **68 remaining endpoints**:
- **🔴 10 HIGH PRIORITY** - Have `status: 500` in catch blocks (lose status codes)
- **🟡 35 MEDIUM PRIORITY** - Already use `error()` but could be more consistent
- **⚪ 23 LOW PRIORITY** - Various error handling patterns
- **5 STREAMING** - WebSocket/SSE endpoints (need special consideration)

---

## 🔴 HIGH PRIORITY (10 endpoints)

These endpoints **always return 500** in catch blocks, losing important HTTP status codes:

### Admin Endpoints (5):
1. **`src/routes/api/admin/deadletters/[id]/retry/+server.ts`**
   - Issue: 5 catch blocks, all return 500
   - Impact: Can't distinguish between auth, not found, and server errors

2. **`src/routes/api/admin/roles/[name]/+server.ts`**
   - Issue: 3 catch blocks return 500
   - Impact: Role operations lose context of failure type

3. **`src/routes/api/admin/seed-roles/+server.ts`**
   - Issue: Returns 500 for all errors
   - Impact: Seed operations don't distinguish between bad request and server error

4. **`src/routes/api/admin/users/[email]/permissions/+server.ts`**
   - Issue: 2 catch blocks return 500
   - Impact: Permission updates lose error specificity

5. **`src/routes/api/admin/users/[email]/+server.ts`**
   - Issue: 3 catch blocks return 500
   - Impact: User CRUD operations lose error detail

### Database Endpoints (5):
6. **`src/routes/api/credentials/mongodb/[credentialId]/collections/+server.ts`**
   - Issue: Returns 500 for all errors
   - Impact: Collection queries lose auth/not-found context

7. **`src/routes/api/mongodb/collections/+server.ts`**
   - Issue: Returns 500 for all errors
   - Impact: MongoDB collection operations lose specificity

8. **`src/routes/api/mongodb/test-connection/+server.ts`**
   - Issue: Returns 500 for all errors
   - Impact: Connection test failures don't distinguish auth from network issues

9. **`src/routes/api/postgres/collections/+server.ts`**
   - Issue: Returns 500 for all errors
   - Impact: PostgreSQL collection queries lose error context

10. **`src/routes/api/postgres/test-connection/+server.ts`**
    - Issue: Returns 500 for all errors
    - Impact: Connection test failures lose specificity

---

## 🟡 MEDIUM PRIORITY (35 endpoints)

These endpoints **already use `error()` correctly** but would benefit from consistency:

### Admin/Monitoring (11 endpoints):
- `src/routes/api/admin/execution/modules/+server.ts`
- `src/routes/api/admin/execution/regno/build/+server.ts`
- `src/routes/api/admin/execution/regno/+server.ts`
- `src/routes/api/admin/feature-flags/+server.ts`
- `src/routes/api/admin/maintenance/persistence/+server.ts`
- `src/routes/api/admin/monitoring/executions/[id]/+server.ts`
- `src/routes/api/admin/monitoring/pipeline-executions/cancel/+server.ts`
- `src/routes/api/admin/monitoring/pipeline-executions/+server.ts`
- `src/routes/api/admin/monitoring/queue/config/+server.ts`
- `src/routes/api/admin/monitoring/queue/+server.ts`
- `src/routes/api/admin/monitoring/stream/+server.ts`
- `src/routes/api/admin/roles/+server.ts`

**Benefit:** Would gain type-safe error helpers and consistent pattern

### Auth Endpoints (7 endpoints):
- `src/routes/api/auth/login/+server.ts`
- `src/routes/api/auth/logout/+server.ts`
- `src/routes/api/auth/password/reset/complete/+server.ts`
- `src/routes/api/auth/password/reset/request/+server.ts`
- `src/routes/api/auth/password/reset/verify/+server.ts`
- `src/routes/api/auth/refresh/+server.ts`
- `src/routes/api/auth/session/+server.ts`
- `src/routes/api/auth/token/+server.ts`

**Benefit:** Critical auth endpoints would have consistent error handling

### Pipeline Executions (10 endpoints):
- `src/routes/api/pipelines/executions/[id]/backpressure/+server.ts`
- `src/routes/api/pipelines/executions/[id]/deadletter-policy/+server.ts`
- `src/routes/api/pipelines/executions/[id]/events/+server.ts`
- `src/routes/api/pipelines/executions/[id]/pause/+server.ts`
- `src/routes/api/pipelines/executions/[id]/ready/+server.ts`
- `src/routes/api/pipelines/executions/[id]/resume-preview/+server.ts`
- `src/routes/api/pipelines/executions/[id]/resume/+server.ts`
- `src/routes/api/pipelines/executions/[id]/stop/+server.ts`
- `src/routes/api/pipelines/executions/[id]/summary/+server.ts`
- `src/routes/api/pipelines/executions/+server.ts`

**Benefit:** Complex pipeline operations would have consistent error handling

### Other (7 endpoints):
- `src/routes/api/code/secure-run/+server.ts`
- `src/routes/api/credentials/llm/models/+server.ts`
- `src/routes/api/credentials/llm/+server.ts`
- `src/routes/api/credentials/llm/test/+server.ts`
- `src/routes/api/credentials/postgres/test/+server.ts`
- `src/routes/api/proxy/+server.ts`
- `src/routes/api/v2/[...path]/+server.ts`

**Benefit:** Various endpoints would benefit from consistency

---

## ⚪ LOW PRIORITY (23 endpoints)

These have various error handling patterns or minimal error handling:

### Admin (9 endpoints):
- Companies management (2 files)
- Dead letters (4 files)
- Metrics (2 files)
- Other admin endpoints

### Credentials/Database (9 endpoints):
- LLM credentials (3 files)
- MongoDB operations (2 files)
- PostgreSQL operations (2 files)
- Other database endpoints

### Other (5 endpoints):
- Debug, guide, and miscellaneous endpoints

**Assessment:** May not need immediate migration, review case-by-case

---

## 🌊 STREAMING ENDPOINTS (5 endpoints)

These require special consideration due to streaming/WebSocket nature:

1. `src/routes/api/admin/monitoring/pipeline-executions/stream/+server.ts`
2. `src/routes/api/admin/monitoring/server-console/stream/+server.ts`
3. `src/routes/api/pipelines/executions/[id]/stream/+server.ts`
4. `src/routes/api/pipelines/executions/[id]/ws/+server.ts`
5. `src/routes/api/mongodb/stream-data/+server.ts`
6. `src/routes/api/postgres/stream-data/+server.ts`

**Note:** These may need custom error handling for streaming contexts

---

## 📋 Migration Priority Order

### Phase 1: Critical (10 endpoints - 1-2 hours)
Migrate HIGH PRIORITY endpoints that lose status codes:
- Admin user/role/deadletter endpoints (5)
- Database connection/collection endpoints (5)

**Impact:** Fixes status code bugs, improves client error handling

### Phase 2: Consistency (35 endpoints - 2-3 hours)
Add consistency to MEDIUM PRIORITY endpoints:
- Auth endpoints (critical for security)
- Pipeline execution endpoints
- Admin monitoring endpoints

**Impact:** Consistent error handling, easier maintenance

### Phase 3: Review (23 endpoints - 1-2 hours)
Case-by-case review of LOW PRIORITY endpoints:
- Determine if migration needed
- Some may already have appropriate error handling

**Impact:** Comprehensive coverage

### Phase 4: Special Cases (6 endpoints - 1 hour)
Handle streaming endpoints separately:
- Review streaming error patterns
- Implement appropriate error handling for SSE/WebSocket

**Impact:** Complete migration

---

## 🎯 Detailed Category Breakdown

### Admin Endpoints (24/27 need review)
**Current State:**
- 5 endpoints with status: 500 issues
- 11 endpoints using error() but inconsistent
- 8 endpoints with various patterns

**Recommendation:** High value, focus on user/role/permission endpoints first

### Auth Endpoints (7/8 need consistency)
**Current State:**
- All use error() function correctly
- Would benefit from ApiError helpers

**Recommendation:** Medium priority but high importance (security-critical)

### Pipeline Endpoints (10/12 need review)
**Current State:**
- All use error() but many have complex catch blocks
- 16+ catch blocks in summary endpoint

**Recommendation:** Would benefit from simplification

### Database/Credentials (13 endpoints)
**Current State:**
- 4 endpoints with status: 500 issues
- 9 endpoints with various patterns

**Recommendation:** Test endpoints are HIGH PRIORITY (auth errors important)

---

## 💡 Migration Benefits by Category

### HIGH PRIORITY Endpoints:
**Before Migration:**
```typescript
try {
  // operation
} catch (e) {
  return json({ error: e.message }, { status: 500 });
}
```
**Problem:**
- Auth errors (401) become 500
- Not found errors (404) become 500
- Permission errors (403) become 500

**After Migration:**
```typescript
try {
  if (!user) throw ApiError.unauthorized();
  if (!found) throw ApiError.notFound();
  // operation
} catch (e: any) {
  handleApiError(e, 'Operation failed');
}
```
**Benefits:**
- ✅ Proper status codes preserved
- ✅ Better client error handling
- ✅ Cleaner code

### MEDIUM PRIORITY Endpoints:
**Current State:**
```typescript
throw error(401, 'Unauthorized');
// ... scattered throughout code
```

**After Migration:**
```typescript
throw ApiError.unauthorized();
// Type-safe, consistent, self-documenting
```

**Benefits:**
- ✅ Type safety
- ✅ Consistency
- ✅ Self-documenting
- ✅ Easier to maintain

---

## 📊 Effort Estimation

| Phase | Endpoints | Estimated Time | Priority |
|-------|-----------|----------------|----------|
| Phase 1: HIGH | 10 | 1-2 hours | 🔴 Critical |
| Phase 2: MEDIUM | 35 | 2-3 hours | 🟡 Important |
| Phase 3: LOW | 23 | 1-2 hours | ⚪ Optional |
| Phase 4: STREAMING | 6 | 1 hour | 🌊 Special |
| **TOTAL** | **74** | **5-8 hours** | |

---

## 🚀 Quick Start Guide

### For HIGH PRIORITY (10 endpoints):

1. **Add imports:**
   ```typescript
   import { handleApiError } from '$lib/server/utils/errorHandler';
   import { ApiError } from '$lib/server/utils/apiErrors';
   ```

2. **Replace catch blocks:**
   ```typescript
   // Before
   } catch (e) {
     return json({ error: e.message }, { status: 500 });
   }

   // After
   } catch (e: any) {
     handleApiError(e, 'Operation failed');
   }
   ```

3. **Add explicit error throws:**
   ```typescript
   if (!authorized) throw ApiError.unauthorized();
   if (!found) throw ApiError.notFound();
   ```

### For MEDIUM PRIORITY (35 endpoints):

Already using `error()` correctly, just need to use `ApiError` helpers:

```typescript
// Before
throw error(401, 'Unauthorized');

// After
throw ApiError.unauthorized();
```

---

## ✅ Success Criteria

After migration, verify:

1. **✅ Status codes preserved**
   - 401 errors stay 401
   - 403 errors stay 403
   - 404 errors stay 404
   - 400 errors stay 400

2. **✅ Consistent error responses**
   - All endpoints use same pattern
   - Error messages are appropriate
   - No sensitive data leaked

3. **✅ Code quality improved**
   - Less duplication
   - Type-safe error throwing
   - Easier to maintain

4. **✅ Client experience improved**
   - Can handle different error types
   - Better error recovery
   - Clearer error messages

---

## 📝 Testing Checklist

For each migrated endpoint:

- [ ] Test with valid request → 200/201 response
- [ ] Test without auth → 401 response (not 500)
- [ ] Test with insufficient permissions → 403 response (not 500)
- [ ] Test with invalid ID → 404 response (not 500)
- [ ] Test with invalid data → 400 response (not 500)
- [ ] Test with server error → 500 response (generic message)

---

## 🎉 Current Progress

**Completed:** 36/104 endpoints (34.6%)
**Remaining:** 68 endpoints
- 🔴 10 HIGH PRIORITY
- 🟡 35 MEDIUM PRIORITY
- ⚪ 23 LOW PRIORITY
- 🌊 6 STREAMING (special case)

**Next Steps:** Start with the 10 HIGH PRIORITY endpoints to fix critical status code bugs.

---

## 📚 Reference

- **Error Handler:** `src/lib/server/utils/errorHandler.ts`
- **Error Helpers:** `src/lib/server/utils/apiErrors.ts`
- **Migration Guide:** `ERROR_HANDLER_MIGRATION_REPORT.md`
- **Completed Summary:** `MIGRATION_COMPLETE_SUMMARY.md`
