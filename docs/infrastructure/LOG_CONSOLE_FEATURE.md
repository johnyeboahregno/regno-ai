# Log Console Feature

## Overview

Added a full-featured logs console to the centralized log server with independent server/client log views, real-time streaming, search, and filtering capabilities.

## Access

**Welcome Page**: `http://fakedomain.com:3001` - Regno-styled help and documentation
**Console URL**: `http://fakedomain.com:3001/console` - Full-featured log viewer

Click "Open Log Console" button on the welcome page to access the console.

## Features

### 📊 Tab-Based Viewing
- **All Logs** - View all logs from all sources
- **Server** - View only server-side logs
- **Client** - View only client-side logs

### 🔍 Powerful Filtering

**Search**: Real-time text search across all log messages

**Level Filter**:
- All Levels
- Errors only
- Warnings only
- Info only
- Debug only
- Log only

**Source Filter**: Dynamically populated based on active log sources
- All Sources
- Server
- Client
- Custom sources (auto-detected)

### ⚡ Real-Time Features

**WebSocket Streaming**:
- Live log updates as they occur
- Auto-reconnect on disconnection
- Connection status indicator (green = connected, red = disconnected)

**Auto-Scroll**:
- Toggle auto-scroll to bottom
- Follows new logs in real-time
- Can be disabled to browse historical logs

**Clear Logs**:
- One-click to clear all displayed logs
- Confirmation prompt to prevent accidents

### 📈 Statistics Bar

- **Total logs count**: Shows all logs received
- **Filtered count**: Shows logs matching current filters
- **Last update time**: Shows when last log was received

### 🎨 Visual Design

**Color-Coded Log Levels**:
- 🔴 **ERROR** - Red border & badge
- 🟠 **WARN** - Orange border & badge
- 🔵 **INFO** - Blue border & badge
- 🟣 **DEBUG** - Purple border & badge
- ⚪ **LOG** - Gray border & badge

**Dark Theme**:
- Professional dark theme similar to admin console
- Reduced eye strain for extended use
- High contrast for readability

**Monospace Font**:
- Log entries use Monaco/Courier New
- Easy to scan and parse log content

### 🔄 Log Format

Each log entry displays:
```
[HH:MM:SS] [LEVEL] [source] Message content
```

**Example**:
```
[14:23:45] [INFO] [server] Pipeline execution started
[14:23:46] [ERROR] [client] Failed to fetch data: Network error
[14:23:47] [WARN] [mapper] Schema validation warning: missing field
```

## Integration

### Sending Logs to Console

**From Client**:
```javascript
// Using the centralized logger
import { logger } from '$lib/utils/centralizedLogger';

logger.info('User action completed');
logger.error('Failed to load data', errorDetails);
logger.debug('Debug information', debugData);
```

**From Server**:
```javascript
// Using console methods (auto-intercepted)
console.log('[server] Server started');
console.error('[server] Database connection failed');
console.warn('[server] Memory usage high');
```

**Via REST API**:
```bash
curl -X POST http://localhost:3001/log \
  -H "Content-Type: application/json" \
  -d '{
    "level": "info",
    "message": "Custom log message",
    "source": "custom-service",
    "timestamp": "2025-10-29T14:23:45.000Z"
  }'
```

## Usage Examples

### View All Server Errors

1. Open console: `http://fakedomain.com:3001/console`
2. Click "Server" tab
3. Select "Errors" in level filter
4. Browse filtered results

### Search for Specific Events

1. Type search term in search box (e.g., "pipeline")
2. Results update in real-time
3. Use filters to narrow results further

### Monitor Live Client Logs

1. Click "Client" tab
2. Enable auto-scroll (checked by default)
3. Watch logs stream in real-time
4. Color-coded entries for quick identification

### Debug Specific Source

1. Use "Source Filter" dropdown
2. Select specific source (e.g., "mapper", "expert")
3. View logs from that source only
4. Combine with level and search filters

## Architecture

### Frontend (Console Page)

**HTML Structure**:
- Header with connection status
- Control bar with tabs and filters
- Log container with scrollable entries
- Stats bar with counts and timestamp

**JavaScript State**:
```javascript
{
  logs: [],              // All logs received
  filteredLogs: [],      // Logs matching filters
  sources: Set,          // Unique sources detected
  activeTab: 'all',      // Current tab selection
  searchTerm: '',        // Search filter
  levelFilter: 'all',    // Level filter
  sourceFilter: 'all',   // Source filter
  autoScroll: true       // Auto-scroll state
}
```

### Backend (Log Server)

**Endpoints**:
- `GET /` - Regno-styled welcome & help page
- `GET /console` - Full-featured console viewer
- `GET /api/logs` - Returns list of available log files
- `GET /logs/:filename` - Returns log file content
- `POST /log` - Accepts new log entries
- `GET /sources` - Returns list of log sources
- `WS /` - WebSocket for real-time streaming

**Log Format**:
```
[2025-10-29T14:23:45.123Z] [INFO] server: Message text
```

**WebSocket Protocol**:

Client → Server:
```json
{
  "type": "subscribe",
  "filename": "server.log"
}
```

Server → Client (log update):
```json
{
  "type": "log",
  "entry": {
    "timestamp": "2025-10-29T14:23:45.123Z",
    "level": "info",
    "source": "server",
    "message": "Log message"
  }
}
```

Server → Client (batch update):
```json
{
  "type": "update",
  "filename": "server.log",
  "lines": ["[timestamp] [LEVEL] source: message", ...]
}
```

## Performance

### Optimization Features

**Client-Side**:
- Filters operate on in-memory arrays
- DOM updates only when filters change
- Efficient rendering with template literals
- Auto-scroll only when enabled

**Server-Side**:
- Log file tailing with 1-second polling
- Broadcasts only to connected clients
- Last 10 lines sent on file change
- Graceful WebSocket reconnection

### Scalability

**Current Limits**:
- Default 1000 lines loaded on page load
- In-memory log storage (client-side)
- Single log file watched per connection

**Future Improvements**:
- Pagination for large log files
- Virtual scrolling for 10K+ logs
- Multiple file subscriptions
- Log rotation handling

## Comparison with Admin Console

| Feature | Log Console | Admin Console |
|---------|-------------|---------------|
| Access | Port 3001 | Main app /admin |
| Focus | Log viewing | Full monitoring |
| Real-time | WebSocket | SSE + WebSocket |
| Filtering | Simple | Advanced |
| Setup | Zero config | Requires auth |
| Use Case | Dev/Debug | Production monitoring |

## Troubleshooting

### Console Not Loading

**Check**:
1. Log server is running: `http://localhost:3001`
2. Port 3001 is not blocked by firewall
3. ENABLE_LOG_SERVER=true in .env file

**Fix**:
```bash
# Check if server is running
curl http://localhost:3001

# Check environment
cat .env | grep LOG_SERVER
```

### No Logs Appearing

**Check**:
1. WebSocket connection status (green indicator)
2. Tab selection (All/Server/Client)
3. Filters not too restrictive

**Fix**:
- Click "Clear" and refresh page
- Check browser console for errors
- Verify logs are being written to server.log

### WebSocket Keeps Disconnecting

**Possible causes**:
- Log server restarting frequently
- Network issues
- Browser throttling inactive tabs

**Fix**:
- Check server stability
- Keep console tab active
- Auto-reconnect will attempt every 3 seconds

## Design

### Regno Styling

The welcome page (`/`) uses Regno AI's design system:

**Colors**:
- Primary: `#4a90e2` (Regno blue)
- Secondary: `#5cb3cc` (light blue)
- Dark: `#2c3e50` (dark blue-gray)
- Darker: `#1a252f` (very dark background)
- Gray: `#ecf0f1` (light gray)

**Features**:
- Gradient background using Regno's darker tones
- Logo with Regno blue gradient
- Pulsing status indicator
- Hover effects on endpoint cards
- Call-to-action button with Regno branding
- Professional shadows and borders
- Responsive padding and spacing

### Console Styling

The console page (`/console`) uses a professional dark theme:
- Dark background for reduced eye strain
- Color-coded log levels
- Monospace font for log entries
- Smooth animations and transitions

## Files Modified

- ✅ `src/lib/server/logServer.ts` - Added Regno-styled `/` welcome page and `/console` endpoint
- ✅ `LOG_CONSOLE_FEATURE.md` - Updated documentation

## Future Enhancements

### Potential Features

1. **Export Logs** - Download filtered logs as file
2. **Timestamps** - Toggle relative vs absolute timestamps
3. **Highlighting** - Highlight search terms in results
4. **Bookmarks** - Save filter combinations
5. **Themes** - Light/dark mode toggle
6. **Split View** - View server + client side-by-side
7. **Stats Charts** - Visualize log volume over time
8. **Alert Rules** - Notifications for specific patterns

## Screenshots

### Welcome Page Features
- 📋 Regno-branded logo with gradient
- ✨ Pulsing "Server Running" status badge
- 📡 REST API endpoint documentation
- 🔌 WebSocket streaming guide
- 📚 Quick curl examples
- 🖥️  Large "Open Log Console" CTA button
- 🏷️  Quick links to list files and view sources

### Console Features
- 📊 All/Server/Client tab switching
- 🔍 Real-time search across logs
- 🎯 Level filtering (Error/Warn/Info/Debug/Log)
- 🏷️  Source filtering (dynamically populated)
- ⚡ Live WebSocket streaming
- 📈 Statistics bar with counts
- 🎨 Color-coded log entries
- ⏱️  Timestamps for each entry
- 🔄 Auto-reconnect on disconnect
- ♻️  Clear logs button

---

**Status**: ✅ **COMPLETE**
**Date**: 2025-10-29
**Key Achievements**:
- Full-featured log console with independent server/client views
- Real-time streaming with search and filtering
- Regno-styled welcome page with branding
- Professional dark theme console interface
**Impact**: Easy debugging and monitoring without switching to admin panel, polished Regno branding
