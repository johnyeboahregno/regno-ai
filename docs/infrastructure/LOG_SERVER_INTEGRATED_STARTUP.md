# Log Server Integrated Startup - Complete

## Summary

The centralized log server now starts automatically as part of the main application server, controlled by environment variables. No separate terminal or process needed!

## What Changed

### 1. Created Log Server Module

**File**: `/disks/disk1/chat/src/lib/server/logServer.ts`

Extracted log server functionality into a reusable TypeScript module with:
- `startLogServer(port)` - Start the log server
- `stopLogServer()` - Stop the log server
- `isLogServerRunning()` - Check server status

**Features**:
- Express REST API for log management
- WebSocket support for real-time streaming
- Automatic log file writing
- Broadcasts logs to all connected clients
- CORS enabled for cross-origin requests

### 2. Integrated with Main Server

**File**: `/disks/disk1/chat/src/hooks.server.ts`

Added initialization code that runs when SvelteKit server starts:

```typescript
// Initialize centralized log server if enabled
import { startLogServer } from '$lib/server/logServer.js';
const ENABLE_LOG_SERVER = process.env.ENABLE_LOG_SERVER === 'true';
const LOG_SERVER_PORT = parseInt(process.env.LOG_SERVER_PORT || '3001', 10);

if (ENABLE_LOG_SERVER) {
	startLogServer(LOG_SERVER_PORT).catch((error) => {
		console.error('❌ Failed to start log server:', error);
	});
}
```

**Benefits**:
- ✅ Single command to start everything: `npm run dev`
- ✅ Log server lifecycle managed automatically
- ✅ Graceful error handling
- ✅ No orphaned processes

### 3. Environment Variables

**Files**: `.env`, `.env.example`

Added three new configuration variables:

```bash
# Enable/disable the centralized log server (starts with main server)
ENABLE_LOG_SERVER=true

# Port for the log server (default: 3001)
LOG_SERVER_PORT=3001

# Client-side log server URL (must match LOG_SERVER_PORT)
VITE_LOGS_SERVER_URL=http://localhost:3001
```

**Default State**: Log server is **enabled** by default (`ENABLE_LOG_SERVER=true`)

### 4. Updated Logger Utility

**File**: `/disks/disk1/chat/src/lib/utils/centralizedLogger.ts`

Logger now reads log server URL from environment variable:

```typescript
const getLogServerUrl = (): string => {
	// Check for Vite environment variable (client-side)
	if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LOGS_SERVER_URL) {
		return import.meta.env.VITE_LOGS_SERVER_URL;
	}

	// Fallback to default
	return 'http://localhost:3001';
};
```

**Benefits**:
- ✅ Single source of truth for log server URL
- ✅ Easy to change for different environments
- ✅ Works for both development and production

## How to Use

### Start Application (Log Server Enabled)

```bash
# Make sure ENABLE_LOG_SERVER=true in .env
npm run dev
```

**Console Output**:
```
📋 Log server running on port 3001
   WebSocket: ws://0.0.0.0:3001
   REST API: http://0.0.0.0:3001/api
🌟 SvelteKit server starting...
```

### Disable Log Server

Edit `.env`:
```bash
ENABLE_LOG_SERVER=false
```

Then start normally:
```bash
npm run dev
```

**Console Output**:
```
🌟 SvelteKit server starting...
```
(No log server message)

### Change Log Server Port

Edit `.env`:
```bash
LOG_SERVER_PORT=3002
VITE_LOGS_SERVER_URL=http://localhost:3002
```

**Important**: Update both variables to keep client and server in sync!

## API Endpoints

All endpoints available at `http://localhost:3001/api`:

### POST /api/log
Send a log entry

**Request**:
```json
{
  "level": "info",
  "message": "User logged in",
  "source": "client",
  "timestamp": "2025-10-29T16:10:39.000Z"
}
```

**Response**:
```json
{
  "success": true
}
```

### GET /api/logs
Get list of available log files

**Response**:
```json
{
  "logs": [
    {
      "name": "server.log",
      "path": "/path/to/server.log",
      "size": 12345,
      "modified": "2025-10-29T16:10:39.000Z",
      "exists": true
    }
  ]
}
```

### GET /api/logs/:filename
Get content of specific log file

**Parameters**:
- `filename` - Name of log file (e.g., "server.log")
- `limit` (optional) - Number of lines to return (default: 1000)

**Response**:
```json
{
  "filename": "server.log",
  "lines": ["2025-10-29T16:10:39.000Z [INFO] client: Log message"],
  "totalLines": 5000
}
```

### GET /api/sources
Get list of all log sources

**Response**:
```json
{
  "sources": ["client", "server", "D3ChartDisplay", "PipelineCanvas"]
}
```

## WebSocket Support

Connect to `ws://localhost:3001` for real-time log streaming.

**Connection Message**:
```json
{
  "type": "status",
  "message": "Connected to log server"
}
```

**Subscribe to Log File**:
```json
{
  "type": "subscribe",
  "filename": "server.log"
}
```

**Receive Updates**:
```json
{
  "type": "update",
  "filename": "server.log",
  "lines": ["Latest log entries..."]
}
```

**Log Entry Broadcast**:
```json
{
  "type": "log",
  "entry": {
    "timestamp": "2025-10-29T16:10:39.000Z",
    "level": "info",
    "source": "client",
    "message": "User action performed"
  }
}
```

## Integration with Existing Code

### D3ChartDisplay.svelte (Already Updated)

```typescript
import { logger } from '$lib/utils/centralizedLogger';

logger.setSource('D3ChartDisplay');

logger.log('📊 Container mounted!');
logger.warn('⚠️ Invalid timestamp:', timestamp);
logger.error('❌ Field not found:', fieldName);
```

**Result**: All logs automatically sent to log server (if enabled) AND appear in console.

### Other Components (Ready to Update)

```typescript
import { logger } from '$lib/utils/centralizedLogger';

logger.setSource('PipelineCanvas');

// Replace all console.log with logger.log
logger.log('Pipeline executing');
logger.info('Pipeline completed');
logger.warn('Pipeline warning');
logger.error('Pipeline error', error);
```

### Server-Side Code

```typescript
import { serverLogger } from '$lib/utils/centralizedLogger';

serverLogger.setSource('MyExecutor');

serverLogger.info('Executor started');
serverLogger.error('Executor failed', error);
```

## Benefits

### Before (Separate Process)
```bash
# Terminal 1
node log-server.js

# Terminal 2
npm run dev

# Problems:
# - Two terminals required
# - Manual startup coordination
# - Forgot to start log server
# - Orphaned processes on crash
```

### After (Integrated)
```bash
# Single terminal
npm run dev

# Benefits:
# ✅ One command to rule them all
# ✅ Automatic lifecycle management
# ✅ Easy to enable/disable
# ✅ No orphaned processes
# ✅ Environment-based configuration
```

## Configuration Examples

### Development (Local)
```bash
ENABLE_LOG_SERVER=true
LOG_SERVER_PORT=3001
VITE_LOGS_SERVER_URL=http://localhost:3001
```

### Production (Same Server)
```bash
ENABLE_LOG_SERVER=true
LOG_SERVER_PORT=3001
VITE_LOGS_SERVER_URL=http://yourdomain.com:3001
```

### Production (Separate Server)
```bash
ENABLE_LOG_SERVER=false  # Don't start on app server
VITE_LOGS_SERVER_URL=http://logs.yourdomain.com:3001  # Point to dedicated log server
```

### CI/CD (Disabled)
```bash
ENABLE_LOG_SERVER=false  # Don't start log server in CI
```

## Troubleshooting

### Port Already in Use
```
❌ Log server port 3001 already in use
```

**Solution**: Change port in .env:
```bash
LOG_SERVER_PORT=3002
VITE_LOGS_SERVER_URL=http://localhost:3002
```

### Log Server Not Starting
Check if `ENABLE_LOG_SERVER=true` in `.env` and restart:
```bash
npm run dev
```

### Logs Not Appearing
1. Check log server is running (look for "📋 Log server running" message)
2. Check `VITE_LOGS_SERVER_URL` matches `LOG_SERVER_PORT`
3. Check browser console for connection errors
4. Verify no firewall blocking port 3001

### Old log-server.js Still Running
Kill it manually:
```bash
# Find process
ps aux | grep log-server

# Kill it
kill -9 <PID>
```

## Files Modified/Created

### Created
- ✅ `/src/lib/server/logServer.ts` - Log server module
- ✅ `LOG_SERVER_INTEGRATED_STARTUP.md` - This document

### Modified
- ✅ `/src/hooks.server.ts` - Added log server initialization
- ✅ `/src/lib/utils/centralizedLogger.ts` - Read URL from env vars
- ✅ `/.env` - Added log server configuration
- ✅ `/.env.example` - Added log server configuration

### Deprecated (Still Works)
- ⚠️ `/log-server.js` - Standalone version (can still be used separately if needed)

## Migration Path

### If You Were Using Standalone log-server.js

**Before**:
```bash
# Terminal 1
node log-server.js

# Terminal 2
npm run dev
```

**After**:
```bash
# Just one terminal
npm run dev
```

**That's it!** Everything else works the same.

### If This Is Your First Time

Just start your app:
```bash
npm run dev
```

The log server is enabled by default and will start automatically.

## Next Steps

1. ✅ **Already Done**: D3ChartDisplay.svelte updated with centralized logger
2. ⏳ **Optional**: Update other components to use logger
3. ⏳ **Optional**: Build a web UI to view logs in real-time
4. ⏳ **Optional**: Add log filtering/searching functionality
5. ⏳ **Optional**: Implement log rotation/archival

---

**Status**: ✅ **COMPLETE**
**Date**: 2025-10-29
**Impact**: Simplified development workflow, one less terminal to manage
**Key Benefit**: Log server now part of main application lifecycle
