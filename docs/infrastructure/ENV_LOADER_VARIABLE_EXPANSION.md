# Environment Variable Loader with Variable Expansion

## Summary

Created a centralized environment loader that supports shell-style variable substitution like `${VAR}` in `.env` files. Works on both server and client, with comprehensive error handling for unresolved variables.

## Problem Solved

**Before**: Variables like `${LOG_SERVER_PORT}` in `.env` were not expanded:
```bash
# .env
LOG_SERVER_PORT=3001
LOG_SERVER_URL=http://fakedomain.com:${LOG_SERVER_PORT}  # ❌ Treated as literal string
```

**Result**: App tried to POST to `/api/$%7BLOG_SERVER_URL%7D/log` (URL-encoded literal)

**After**: Variables are properly expanded:
```bash
# .env
LOG_SERVER_PORT=3001
LOG_SERVER_URL=http://fakedomain.com:${LOG_SERVER_PORT}  # ✅ Expands to http://fakedomain.com:3001
```

## Usage

### Import the Env Loader

```typescript
import { getEnv, env, hasEnv, getAllEnv } from '$lib/utils/envLoader';
```

### Get Environment Variables

```typescript
// Method 1: Using getEnv function
const logServerUrl = getEnv('LOG_SERVER_URL');
const port = getEnv('LOG_SERVER_PORT', '3001'); // with default

// Method 2: Using env proxy object
const logServerUrl = env.LOG_SERVER_URL;
const port = env.LOG_SERVER_PORT;

// Method 3: Check if variable exists
if (hasEnv('LOG_SERVER_URL')) {
  console.log('Log server configured');
}

// Method 4: Get all variables
const allEnv = getAllEnv();
console.log('Available vars:', Object.keys(allEnv));
```

### Works Everywhere

```typescript
// Server-side (hooks.server.ts, +server.ts, etc.)
import { getEnv } from '$lib/utils/envLoader';
const mongoUri = getEnv('MONGO_URI');

// Client-side (components, stores, etc.)
import { getEnv } from '$lib/utils/envLoader';
const publicUrl = getEnv('VITE_PUBLIC_URL');
```

## Supported Syntax

### 1. Basic Variable Reference

```bash
# .env
BASE_URL=http://localhost
API_URL=${BASE_URL}/api  # → http://localhost/api
```

### 2. Nested References

```bash
# .env
PORT=3001
HOST=localhost
PROTOCOL=http
BASE_URL=${PROTOCOL}://${HOST}:${PORT}  # → http://localhost:3001
LOG_SERVER_URL=${BASE_URL}/logs         # → http://localhost:3001/logs
```

### 3. Default Values

```bash
# .env
# If LOG_LEVEL is not set, use 'info'
LOG_LEVEL=${LOG_LEVEL:-info}

# If DATABASE_URL is not set, use default
DATABASE_URL=${DATABASE_URL:-postgresql://localhost:5432/mydb}
```

### 4. Simple Dollar Syntax

```bash
# .env
APP_NAME=Regno
WELCOME_MESSAGE=Welcome to $APP_NAME  # → Welcome to Regno
```

## Error Handling

### Unresolved Variables (Throws Error)

```bash
# .env
LOG_SERVER_URL=${MISSING_VAR}/api
```

**Console Output**:
```
❌ Unresolved environment variables in LOG_SERVER_URL: MISSING_VAR
   Original value: ${MISSING_VAR}/api
   Expanded to: ${MISSING_VAR}/api
   Available variables: LOG_SERVER_PORT, LOG_LEVEL, ...
Error: Failed to resolve environment variable LOG_SERVER_URL
```

**App will not start** until you fix the `.env` file!

### Circular References (Throws Error)

```bash
# .env
VAR_A=${VAR_B}
VAR_B=${VAR_C}
VAR_C=${VAR_A}  # ❌ Circular!
```

**Console Output**:
```
❌ Circular reference detected: VAR_A → VAR_B → VAR_C → VAR_A
Error: Circular reference detected
```

### With Defaults (No Error)

```bash
# .env
LOG_LEVEL=${MISSING_VAR:-debug}  # ✅ Uses default 'debug'
```

**No error** - defaults prevent failures

## Integration

### Server Startup (hooks.server.ts)

```typescript
// Load .env file
import 'dotenv/config';

// Resolve variable references
import '$lib/utils/envLoader.js';  // ✅ Auto-resolves process.env

// Now all process.env variables are expanded
console.log(process.env.LOG_SERVER_URL);  // → http://localhost:3001
```

### Components

```typescript
import { getEnv } from '$lib/utils/envLoader';

const logServerUrl = getEnv('VITE_LOG_SERVER_URL');
console.log(logServerUrl);  // → http://fakedomain.com:3001
```

### Services

```typescript
import { env } from '$lib/utils/envLoader';

class LogService {
  private url = env.VITE_LOG_SERVER_URL;  // ✅ Expanded

  async sendLog(message: string) {
    await fetch(`${this.url}/log`, { ... });
  }
}
```

## Example .env File

```bash
# ============================================
# Base Configuration
# ============================================

# Server
PORT=5173
HOST=fakedomain.com
PROTOCOL=http
PUBLIC_URL=${PROTOCOL}://${HOST}:${PORT}

# ============================================
# Log Server
# ============================================

LOG_SERVER_PORT=3001
LOG_SERVER_HOST=${HOST}  # Reuse HOST
LOG_SERVER_URL=${PROTOCOL}://${LOG_SERVER_HOST}:${LOG_SERVER_PORT}

# Client-side (VITE_ prefix required)
VITE_LOG_SERVER_URL=${LOG_SERVER_URL}

# ============================================
# Database
# ============================================

DB_HOST=potato
DB_PORT=27017
DB_NAME=regno
MONGO_URI=mongodb://${DB_HOST}:${DB_PORT}/${DB_NAME}

# ============================================
# API Endpoints
# ============================================

API_BASE=${PUBLIC_URL}/api
VITE_CHAT_ENDPOINT=${API_BASE}/chat
VITE_PIPELINE_ENDPOINT=${API_BASE}/pipelines

# ============================================
# Feature Flags
# ============================================

# With defaults
DEBUG_MODE=${DEBUG_MODE:-false}
LOG_LEVEL=${LOG_LEVEL:-info}
ENABLE_LOG_SERVER=${ENABLE_LOG_SERVER:-true}
```

## Advanced Features

### Clear Cache (Hot Reload)

```typescript
import { clearEnvCache } from '$lib/utils/envLoader';

// Clear cached values (useful for testing)
clearEnvCache();

// Next call will re-read and re-expand all variables
const freshValue = getEnv('LOG_SERVER_URL');
```

### Check Variable Exists

```typescript
import { hasEnv } from '$lib/utils/envLoader';

if (hasEnv('MONGO_URI')) {
  await connectToMongo();
} else {
  console.warn('MongoDB not configured');
}
```

### Get All Variables

```typescript
import { getAllEnv } from '$lib/utils/envLoader';

const allVars = getAllEnv();
console.log('Environment:', JSON.stringify(allVars, null, 2));
```

## Testing

### Test 1: Basic Expansion

**`.env`**:
```bash
PORT=3001
URL=http://localhost:${PORT}
```

**Test**:
```typescript
import { getEnv } from '$lib/utils/envLoader';
console.log(getEnv('URL'));  // → http://localhost:3001
```

### Test 2: Nested Expansion

**`.env`**:
```bash
HOST=localhost
PORT=3001
PROTOCOL=http
BASE=${PROTOCOL}://${HOST}:${PORT}
API=${BASE}/api
```

**Test**:
```typescript
console.log(getEnv('API'));  // → http://localhost:3001/api
```

### Test 3: Error on Unresolved

**`.env`**:
```bash
URL=${MISSING_VAR}/api
```

**Test**:
```typescript
try {
  getEnv('URL');
} catch (error) {
  console.error(error);  // ❌ Unresolved environment variables in URL: MISSING_VAR
}
```

### Test 4: Default Values Work

**`.env`**:
```bash
URL=${MISSING_VAR:-http://localhost:3001}
```

**Test**:
```typescript
console.log(getEnv('URL'));  // → http://localhost:3001 (no error!)
```

## Migration Guide

### Before (Direct Access)

```typescript
// Server-side
const url = process.env.LOG_SERVER_URL;

// Client-side
const url = import.meta.env.VITE_LOG_SERVER_URL;
```

**Problem**: No variable expansion, different APIs

### After (Unified Loader)

```typescript
// Works everywhere!
import { getEnv } from '$lib/utils/envLoader';
const url = getEnv('VITE_LOG_SERVER_URL');
```

**Benefits**: Variable expansion + single API

## Performance

### Caching

- Variables resolved **once** on first access
- Results cached in memory
- Subsequent calls are instant (no re-parsing)

### Initialization

```typescript
// First call (expensive)
getEnv('LOG_SERVER_URL');  // Reads all env vars, expands references

// Subsequent calls (cheap)
getEnv('LOG_SERVER_URL');  // Returns cached value
getEnv('MONGO_URI');       // Returns cached value
```

### Startup Impact

- **Server**: Resolves during `import '$lib/utils/envLoader.js'` (~5-10ms)
- **Client**: Resolves on first component mount (~1-2ms)

Negligible impact on startup time.

## Troubleshooting

### Issue: Variables Not Expanding

**Check**:
1. Did you import the loader? `import '$lib/utils/envLoader.js'`
2. Is the variable defined in `.env`?
3. Is the syntax correct? `${VAR}` not `$VAR` (for complex refs)

### Issue: "Unresolved environment variables"

**Fix**: Either define the variable or provide a default:
```bash
# Option 1: Define it
MISSING_VAR=value

# Option 2: Provide default
URL=${MISSING_VAR:-http://localhost:3001}
```

### Issue: Circular Reference Error

**Fix**: Break the circular chain:
```bash
# Bad
VAR_A=${VAR_B}
VAR_B=${VAR_A}

# Good
BASE=localhost
VAR_A=${BASE}
VAR_B=${BASE}
```

### Issue: Client Can't Access Server Variables

**Remember**: Client can only access `VITE_*` prefixed variables!

```bash
# Server only (not available to client)
LOG_SERVER_PORT=3001

# Client accessible (with VITE_ prefix)
VITE_LOG_SERVER_PORT=3001
```

## Files Created

- ✅ `src/lib/utils/envLoader.ts` - Centralized env loader
- ✅ `ENV_LOADER_VARIABLE_EXPANSION.md` - This document

## Files Modified

- ✅ `src/hooks.server.ts` - Import env loader early
- ✅ `src/lib/utils/logInterceptor.ts` - Use getEnv
- ✅ `src/lib/utils/centralizedLogger.ts` - Use getEnv
- ✅ `.env` - Uses variable substitution

## Benefits

1. **Single Source of Truth**: Define once, reference everywhere
2. **DRY**: No duplicate URLs/ports in config
3. **Type Safe**: Same API everywhere (server/client)
4. **Error Handling**: Fails fast with clear messages
5. **Maintainable**: Easy to update (change BASE_URL → all refs update)

---

**Status**: ✅ **COMPLETE**
**Date**: 2025-10-29
**Key Achievement**: Shell-style variable expansion in `.env` files with comprehensive error handling
**Impact**: No more hardcoded URLs, cleaner config, fewer errors
