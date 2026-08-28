# Cortex Flow Phase 4: MCP Server Integration

## Overview

Phase 4 integrates the Model Context Protocol (MCP) into Cortex Flow, enabling connection to external MCP servers that provide additional tools. This creates a VS Code extension-style system for managing and using MCP-provided capabilities.

## What This Integration Provides

### 1. **Pre-defined MCP Server Directory**

9 popular MCP servers are pre-configured and ready to use:

| Server | Category | Description | Tools |
|--------|----------|-------------|-------|
| **Filesystem** | file-system | Read/write local files | read_file, write_file, list_directory |
| **Brave Search** | web | Web search via Brave API | brave_search |
| **GitHub** | cloud | GitHub repository operations | create_issue, create_pull_request, search_repos |
| **Puppeteer** | web | Browser automation | navigate, screenshot, click, type |
| **Sequential Thinking** | ai | Step-by-step reasoning | think_step_by_step |
| **PostgreSQL** | database | Database operations | query, execute |
| **Slack** | communication | Slack messaging | send_message, list_channels |
| **Memory** | ai | Persistent memory | store, retrieve, search |
| **Fetch** | web | HTTP requests | fetch |

### 2. **Server Connection Management**

The `McpServerManager` handles:
- **stdio protocol**: Spawning MCP server processes
- **HTTP protocol**: Connecting to HTTP-based MCP servers
- **JSON-RPC communication**: MCP protocol implementation
- **Connection lifecycle**: Connect, disconnect, reconnect
- **Error handling**: Timeouts, process errors, connection failures

### 3. **Tool Registry Integration**

MCP tools are dynamically loaded into the ToolRegistry:
- Automatic tool discovery from connected servers
- Tool definitions generated for Claude API
- Seamless execution through the registry
- Tool naming: `mcp_{serverId}_{toolName}`

### 4. **VS Code Extension-Style UI**

The `McpServerPanel` provides:
- Server browser with categories
- Enable/disable toggles per server
- Per-tool enable/disable controls
- API key configuration for authenticated servers
- Connection testing
- Status indicators

---

## API Endpoints

### Connect to Server
```
POST /api/cortex-flow/mcp/connect
{
  "serverId": "brave-search",
  "config": {
    "serverId": "brave-search",
    "enabled": true,
    "enabledTools": ["brave_search"],
    "authCredentials": { "apiKey": "..." }
  }
}
```

### Disconnect from Server
```
POST /api/cortex-flow/mcp/disconnect
{
  "serverId": "brave-search"
}
```

### Get Server Statuses
```
GET /api/cortex-flow/mcp/status

Response:
{
  "success": true,
  "servers": [
    {
      "serverId": "brave-search",
      "connected": true,
      "lastConnected": "2024-...",
      "toolsAvailable": 1
    }
  ],
  "totalConnected": 1,
  "totalTools": 1,
  "tools": [
    {
      "serverId": "brave-search",
      "serverName": "Brave Search",
      "toolName": "brave_search",
      "description": "Search the web using Brave"
    }
  ]
}
```

### Test Tool Execution
```
POST /api/cortex-flow/mcp/test
{
  "serverId": "brave-search",
  "toolName": "brave_search",
  "input": { "query": "test query" }
}
```

---

## Files Created/Modified

### New Files
- `src/routes/api/cortex-flow/mcp/connect/+server.ts` - Connect endpoint
- `src/routes/api/cortex-flow/mcp/disconnect/+server.ts` - Disconnect endpoint
- `src/routes/api/cortex-flow/mcp/status/+server.ts` - Status endpoint
- `src/routes/api/cortex-flow/mcp/test/+server.ts` - Test endpoint

### Enhanced Files
- `src/lib/server/cortex-flow/ToolRegistry.ts` - Added MCP tool integration methods
- `src/lib/components/cortex-flow/McpServerPanel.svelte` - Updated connection testing

### Existing Infrastructure (Pre-Phase 4)
- `src/lib/types/mcpServer.ts` - Type definitions + server directory
- `src/lib/server/cortex-flow/McpServerManager.ts` - Server connection management
- `src/lib/components/cortex-flow/McpServerPanel.svelte` - UI panel

---

## Settings Configuration

### Location in UI
**Settings > MCP Servers**

### Server Configuration
```typescript
interface McpServerConfig {
  serverId: string;
  enabled: boolean;
  enabledTools: string[];
  authCredentials?: {
    apiKey?: string;
    token?: string;
  };
  customEnv?: Record<string, string>;
  timeout?: number;
}
```

### Settings Structure
```typescript
{
  // ... other settings
  mcpServers: [
    {
      serverId: 'brave-search',
      enabled: true,
      enabledTools: ['brave_search'],
      authCredentials: { apiKey: 'xxx' }
    }
  ]
}
```

---

## Using MCP Tools

### Connecting a Server

1. Open Settings modal
2. Go to "MCP Servers" tab
3. Find server (e.g., Brave Search)
4. Enter API key if required
5. Click "Enable"
6. Click "Test Connection"

### Tool Availability

Once connected, MCP tools are available to Cortex Flow:
- Tools appear in executor's available tools
- Named as `mcp_{serverId}_{toolName}`
- Descriptions prefixed with `[MCP: ServerName]`

### Example: Using Brave Search

```
// Tool definition sent to Claude
{
  name: "mcp_brave-search_brave_search",
  description: "[MCP: Brave Search] Search the web using Brave",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" }
    },
    required: ["query"]
  }
}
```

---

## ToolRegistry MCP Methods

### loadMcpTools()
```typescript
// Load all tools from connected MCP servers
const loadedCount = await registry.loadMcpTools();
```

### clearMcpTools()
```typescript
// Remove all MCP tools from registry
registry.clearMcpTools();
```

### refreshMcpTools()
```typescript
// Clear and reload MCP tools
const loadedCount = await registry.refreshMcpTools();
```

### getMcpToolDefinitions()
```typescript
// Get tool definitions for Claude API
const definitions = registry.getMcpToolDefinitions();
```

---

## Verification Checklist

1. **Server Directory**
   - [ ] All 9 servers appear in MCP Servers tab
   - [ ] Categories display correctly
   - [ ] Server details show tools

2. **Connection Management**
   - [ ] Test connection works
   - [ ] API key configuration saves
   - [ ] Connection status updates

3. **Tool Integration**
   - [ ] MCP tools load into registry
   - [ ] Tools available after connection
   - [ ] Tool execution works

4. **API Endpoints**
   - [ ] /connect creates connection
   - [ ] /disconnect terminates cleanly
   - [ ] /status returns correct info
   - [ ] /test executes tool

---

## Future Enhancements

### Phase 4b: Extended MCP Support
1. WebSocket protocol support
2. Custom server configuration (user-defined servers)
3. Server health monitoring
4. Automatic reconnection

### Phase 4c: MCP Resources & Prompts
1. MCP resources integration
2. MCP prompts integration
3. Resource caching

---

## Version History

- **v1.0** (Phase 4) - MCP server integration with API endpoints and ToolRegistry integration
