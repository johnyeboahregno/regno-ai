# Log Server Auto Port Selection - Complete

## Summary

The log server now **automatically finds the next available port** if the requested port (3001) is already in use. No more "EADDRINUSE" errors or manual port management!

## How It Works

### 1. Port Availability Check

**Function**: `isPortAvailable(port)`
```typescript
async function isPortAvailable(port: number): Promise<boolean> {
  const server = net.createServer();

  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') resolve(false);
  });

  server.once('listening', () => {
    server.close();
    resolve(true);
  });

  server.listen(port, '0.0.0.0');
}
```

### 2. Find Next Available Port

**Function**: `findAvailablePort(startPort, maxAttempts)`
```typescript
async function findAvailablePort(startPort: number, maxAttempts: number = 10): Promise<number> {
  for (let port = startPort; port < startPort + maxAttempts; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available ports found between ${startPort} and ${startPort + maxAttempts - 1}`);
}
```

**Behavior**:
- Tries ports 3001, 3002, 3003, ..., 3010
- Returns first available port
- Throws error if all 10 ports are in use

### 3. Start Log Server

**Function**: `startLogServer(requestedPort)`
```typescript
export async function startLogServer(requestedPort: number = 3001): Promise<number> {
  // Check if already running
  if (isRunning && logServerInstance) {
    return currentPort!;
  }

  // Check if requested port is available
  const portAvailable = await isPortAvailable(requestedPort);

  if (!portAvailable) {
    console.log(`⚠️  Port ${requestedPort} is in use. Finding next available port...`);
    port = await findAvailablePort(requestedPort);
    console.log(`✅ Using port ${port} instead`);
  } else {
    port = requestedPort;
  }

  // Start server and return actual port used
  return port;
}
```

**Returns**: The actual port number used

## Integration

### Server-Side (hooks.server.ts)

```typescript
const actualPort = await startLogServer(LOG_SERVER_PORT);

// Update environment with actual port
if (actualPort !== LOG_SERVER_PORT) {
  const actualUrl = `http://localhost:${actualPort}`;
  process.env.ACTUAL_LOG_SERVER_PORT = actualPort.toString();
  process.env.VITE_LOG_SERVER_URL = actualUrl;
  console.log(`📋 Note: Log server URL is ${actualUrl}`);
}
```

### Client-Side Discovery (+layout.svelte)

Client fetches actual port from server:
```typescript
fetch('/api/log-server-info')
  .then(res => res.json())
  .then(info => {
    const logServerUrl = info.url;  // Auto-detected URL
    const port = info.port;          // Auto-detected port

    // Initialize interceptor with correct URL
    const interceptor = initializeLogInterceptor();
    interceptor.logServerUrl = logServerUrl;
  });
```

### Discovery Endpoint (api/log-server-info/+server.ts)

```typescript
export const GET: RequestHandler = async () => {
  const enabled = process.env.ENABLE_LOG_SERVER === 'true';
  const actualPort = process.env.ACTUAL_LOG_SERVER_PORT || process.env.LOG_SERVER_PORT || '3001';
  const baseUrl = process.env.VITE_LOG_SERVER_URL || `http://localhost:${actualPort}`;

  return json({
    enabled,
    port: parseInt(actualPort, 10),
    url: baseUrl
  });
};
```

## Console Output Examples

### Scenario 1: Port 3001 Available

```bash
🌟 SvelteKit server starting...
📋 Log server running on port 3001
   WebSocket: ws://0.0.0.0:3001
   REST API: http://0.0.0.0:3001
📋 Log server started successfully
```

### Scenario 2: Port 3001 In Use

```bash
🌟 SvelteKit server starting...
⚠️  Port 3001 is in use. Finding next available port...
✅ Using port 3002 instead
📋 Log server running on port 3002
   WebSocket: ws://0.0.0.0:3002
   REST API: http://0.0.0.0:3002
📋 Note: Log server URL is http://localhost:3002
📋 Log server started successfully
```

### Scenario 3: Hot Reload (Reusing Existing Instance)

```bash
🌟 SvelteKit server starting...
📋 Log server already running on port 3001 (reusing existing instance)
📋 Log server started successfully
```

### Browser Console (Client-Side)

```
📋 Centralized Logging Enabled
All console output is being sent to the centralized log server
🔗 View logs at: http://localhost:3002
   REST API: http://localhost:3002/logs
   WebSocket: ws://localhost:3002
   (Using auto-detected port 3002)
```

## Benefits

### Before (Manual Port Management)

```bash
# Terminal output
❌ Log server port 3001 already in use

# You had to:
1. Find and kill the process: lsof -ti:3001 | xargs kill -9
2. Or change .env: LOG_SERVER_PORT=3002
3. Restart server
```

### After (Automatic)

```bash
# Terminal output
⚠️  Port 3001 is in use. Finding next available port...
✅ Using port 3002 instead
📋 Log server running on port 3002

# No manual intervention needed!
```

### Key Advantages

1. **Zero Configuration**: Works out of the box
2. **Hot Reload Safe**: Reuses existing instance on dev server restart
3. **Multi-Instance**: Can run multiple app instances simultaneously
4. **Auto Discovery**: Client automatically finds the correct port
5. **Developer Friendly**: Clear console messages about what's happening

## Testing

### Test 1: Normal Start
```bash
# Kill any existing log servers
lsof -ti:3001 | xargs kill -9 2>/dev/null

# Start app
npm run dev
```

**Expected**:
```
📋 Log server running on port 3001
```

### Test 2: Port Already In Use
```bash
# Start a dummy server on 3001
node -e "require('http').createServer().listen(3001)"

# In another terminal, start app
npm run dev
```

**Expected**:
```
⚠️  Port 3001 is in use. Finding next available port...
✅ Using port 3002 instead
📋 Log server running on port 3002
📋 Note: Log server URL is http://localhost:3002
```

### Test 3: Multiple App Instances
```bash
# Terminal 1
npm run dev
# Uses port 3001

# Terminal 2 (different project directory)
npm run dev
# Uses port 3002

# Terminal 3 (another project)
npm run dev
# Uses port 3003
```

### Test 4: Hot Reload
```bash
# Start app
npm run dev

# Edit a server file (triggers hot reload)
# Watch console...
```

**Expected**:
```
📋 Log server already running on port 3001 (reusing existing instance)
```

### Test 5: Client Discovery
```bash
# Start app with different port
npm run dev

# Open browser console at http://localhost:5173
# Check console output
```

**Expected**:
```
📋 Centralized Logging Enabled
🔗 View logs at: http://localhost:3002
   (Using auto-detected port 3002)
```

## Troubleshooting

### All Ports Exhausted (3001-3010)

**Symptom**:
```
❌ No available ports found between 3001 and 3010
```

**Solution**:
```bash
# Find and kill log servers
lsof -ti:3001,3002,3003,3004,3005,3006,3007,3008,3009,3010 | xargs kill -9

# Or reboot (nuclear option)
```

### Client Can't Connect

**Symptom**: Browser logs not appearing in log server

**Debug**:
1. Check server console for actual port:
   ```
   📋 Log server running on port 3002
   ```

2. Check browser console for client URL:
   ```
   🔗 View logs at: http://localhost:3002
   ```

3. Verify endpoint works:
   ```bash
   curl http://localhost:3002/logs
   ```

4. Check `/api/log-server-info`:
   ```bash
   curl http://localhost:5173/api/log-server-info
   # Should return: {"enabled":true,"port":3002,"url":"http://localhost:3002"}
   ```

### Wrong Port After Restart

**Symptom**: Client still using old port after server restart

**Solution**: Hard refresh browser (Ctrl+Shift+R) to re-fetch log-server-info

## Configuration

### Change Port Range

Edit `src/lib/server/logServer.ts`:
```typescript
// Default: tries 10 ports (3001-3010)
async function findAvailablePort(startPort: number, maxAttempts: number = 10)

// Change to try 20 ports (3001-3020)
async function findAvailablePort(startPort: number, maxAttempts: number = 20)
```

### Change Starting Port

Edit `.env`:
```bash
LOG_SERVER_PORT=4001  # Start from 4001 instead of 3001
```

Will try: 4001, 4002, 4003, ..., 4010

## Files Modified

### Created
- ✅ `src/routes/api/log-server-info/+server.ts` - Discovery endpoint
- ✅ `LOG_SERVER_AUTO_PORT_SELECTION.md` - This document

### Modified
- ✅ `src/lib/server/logServer.ts` - Auto port selection logic
- ✅ `src/hooks.server.ts` - Capture actual port
- ✅ `src/routes/+layout.svelte` - Client-side discovery

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Server Startup                        │
├─────────────────────────────────────────────────────────┤
│  1. Load .env (LOG_SERVER_PORT=3001)                    │
│  2. Call startLogServer(3001)                            │
│     ├─ Check if port 3001 available                     │
│     │   ├─ YES → Use 3001                               │
│     │   └─ NO  → Try 3002, 3003, ... 3010               │
│     └─ Return actual port (e.g., 3002)                  │
│  3. Update process.env.ACTUAL_LOG_SERVER_PORT = 3002    │
│  4. Update process.env.VITE_LOG_SERVER_URL = ...        │
│  5. Initialize log interceptor                          │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│              Client Initialization                       │
├─────────────────────────────────────────────────────────┤
│  1. Fetch /api/log-server-info                          │
│     Response: {enabled: true, port: 3002, url: "..."}   │
│  2. Show console notification with actual URL           │
│  3. Initialize log interceptor with actual URL          │
│  4. All logs now sent to correct port                   │
└─────────────────────────────────────────────────────────┘
```

---

**Status**: ✅ **COMPLETE**
**Date**: 2025-10-29
**Key Achievement**: Zero-configuration port management with automatic fallback
**Developer Experience**: No more manual port cleanup or EADDRINUSE errors!
