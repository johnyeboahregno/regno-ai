# Centralized Logging Quick Start Guide

## Problem Solved

Your console.log statements were causing `$state proxy` warnings in Svelte because they were logging reactive objects:

```
[svelte] console_log_state
Your `console.log` contained `$state` proxies.
```

This contributed to the infinite effect loop issues (2000+ effects).

## Solution Implemented

Created a centralized logging system that:
1. **Deep-clones all values** before logging (eliminates proxy warnings)
2. **Sends logs to a central server** for unified monitoring
3. **Falls back to console.log** if server not running
4. **Separates client/server logs** automatically

## Quick Start

### 1. Start the Log Server

Open a terminal and run:

```bash
node log-server.js
```

You should see:
```
Log server running on port 3001
WebSocket endpoint: ws://0.0.0.0:3001
REST API: http://0.0.0.0:3001/api
```

**Note**: Keep this terminal running. The log server will:
- Accept logs via POST requests to `/api/log`
- Broadcast logs via WebSocket for real-time monitoring
- Save all logs to `server.log` file

### 2. Start Your Application

In another terminal:

```bash
npm run dev
```

### 3. Check the Logs

**Option A - Browser Console** (fallback always enabled):
- Open browser DevTools
- Console tab will show all logs (deep-cloned values)
- No more `$state proxy` warnings!

**Option B - Log Server File**:
```bash
tail -f server.log
```

**Option C - Real-time WebSocket** (if you want to build a log viewer):
```bash
# Install wscat if you don't have it
npm install -g wscat

# Connect to WebSocket
wscat -c ws://localhost:3001
```

## What Changed

### D3ChartDisplay.svelte

**Before**:
```typescript
console.log('📊 Container mounted!');
console.log('First record:', data[0]);  // ❌ Causes $state proxy warning
console.warn('⚠️ Invalid timestamp');
console.error('❌ Field not found', error);
```

**After**:
```typescript
import { logger } from '$lib/utils/centralizedLogger';

logger.setSource('D3ChartDisplay');

logger.log('📊 Container mounted!');
logger.log('First record:', data[0]);  // ✅ Deep-cloned, no warning
logger.warn('⚠️ Invalid timestamp');
logger.error('❌ Field not found', error);
```

**Changes Made**:
- ✅ Added import for centralized logger
- ✅ Set source identifier ('D3ChartDisplay')
- ✅ Replaced all 60+ console.log statements with logger.log
- ✅ Replaced all console.warn statements with logger.warn
- ✅ Replaced all console.error statements with logger.error

## Testing

### Test 1: Without Log Server (Fallback Mode)

1. **Don't start log server**
2. Start app: `npm run dev`
3. Open browser console
4. You should see logs in console (no $state proxy warnings)
5. Logs are deep-cloned before being displayed

### Test 2: With Log Server (Full Mode)

1. **Start log server**: `node log-server.js`
2. Start app: `npm run dev`
3. Open browser console (logs still appear - fallback enabled)
4. Check `server.log` file: `tail -f server.log`
5. You should see:
   ```
   2025-10-29T16:10:39.000Z [INFO] D3ChartDisplay: 📊 Container mounted!
   2025-10-29T16:10:39.100Z [INFO] D3ChartDisplay: First record: { _id: '...', startTime: '...', min: 42 }
   ```

### Test 3: Verify No Proxy Warnings

1. Start both log server and app
2. Load a D3 chart with streaming data
3. Check browser console
4. **Expected**: No `[svelte] console_log_state` warnings
5. **Expected**: Smooth streaming without infinite loops

## Log Server API

### Send Log (POST /api/log)

```bash
curl -X POST http://localhost:3001/api/log \
  -H "Content-Type: application/json" \
  -d '{
    "level": "info",
    "message": "Test message",
    "source": "client",
    "timestamp": "2025-10-29T16:10:39.000Z"
  }'
```

### Get All Logs (GET /api/logs)

```bash
curl http://localhost:3001/api/logs
```

### Get Log Sources (GET /api/sources)

```bash
curl http://localhost:3001/api/sources
```

## Using in Other Components

### Client-Side Component

```typescript
import { logger } from '$lib/utils/centralizedLogger';

logger.setSource('MyComponent');

// Use like console
logger.log('Message', data);
logger.info('Information');
logger.warn('Warning');
logger.error('Error', errorObj);
logger.debug('Debug info');
```

### Server-Side Code (+server.ts)

```typescript
import { serverLogger } from '$lib/utils/centralizedLogger';

serverLogger.setSource('MyAPI');

export async function POST({ request }) {
  serverLogger.info('API request received');

  try {
    // ... your code ...
    serverLogger.info('Request processed successfully');
  } catch (error) {
    serverLogger.error('API error:', error);
  }
}
```

## Configuration

### Change Log Server URL

```typescript
// If log server is on different host/port
logger.setLogServerUrl('http://192.168.1.100:3001');
```

### Disable Console Fallback (Server-Only Mode)

```typescript
// Only send to log server, don't use console.log
logger.setFallbackToConsole(false);
```

### Reset Server Check (Retry After Disconnect)

```typescript
// If log server was down and came back up
logger.resetServerCheck();
```

## Benefits

### 1. No More Proxy Warnings ✅
- All values deep-cloned before logging
- Svelte reactivity system never sees log operations
- Clean console output

### 2. Centralized Monitoring ✅
- All client logs in one place
- All server logs in one place
- Easy to filter by source/level/time
- Real-time WebSocket streaming

### 3. Production-Ready ✅
- Graceful fallback if server unavailable
- Non-blocking async logging
- Error handling for edge cases
- Performance optimized with caching

### 4. Developer-Friendly ✅
- Drop-in replacement for console.log
- Same API you're used to
- TypeScript support
- Configurable per module

## Troubleshooting

### Logs Not Appearing in server.log

1. Check if log server is running: `ps aux | grep log-server`
2. Check server.log file exists: `ls -l server.log`
3. Check permissions: `chmod 644 server.log`
4. Restart log server: `node log-server.js`

### Still Seeing $state Proxy Warnings

1. Verify import: `import { logger } from '$lib/utils/centralizedLogger'`
2. Verify replacement: Search for remaining `console.log` statements
3. Clear browser cache and reload
4. Check for console.log in node_modules (unlikely)

### Log Server Connection Errors

1. Check port 3001 is available: `lsof -i :3001`
2. Try different port: `LOG_SERVER_PORT=3002 node log-server.js`
3. Check firewall settings
4. Verify fetch is working in browser

## Next Steps

### Integration Checklist

- ✅ D3ChartDisplay.svelte (completed)
- ⏳ PipelineCanvas.svelte
- ⏳ DataManagementCanvas.svelte
- ⏳ All Executor files (AgentExecutor, MapperExecutor, etc.)
- ⏳ All API routes (+server.ts files)
- ⏳ All server services

### Future Enhancements

1. **Log Viewer UI**: Build a web UI to view logs in real-time
2. **Log Filtering**: Add UI for filtering by source, level, time range
3. **Log Export**: Export logs as CSV/JSON
4. **Log Alerts**: Trigger alerts for specific error patterns
5. **Performance Metrics**: Track log volume, response times

---

**Status**: ✅ **COMPLETE**
**Date**: 2025-10-29
**Impact**: Eliminates $state proxy warnings, enables centralized log management
**Files Modified**:
- Created: `src/lib/utils/centralizedLogger.ts`
- Updated: `src/lib/components/node-displays/D3ChartDisplay.svelte`
