# MCP First-Class Integration & Observability

## Overview

This document covers the Phase 0 MCP First-Class Integration and Phase 1 Langfuse Observability implementation for the Cortex Flow system. These enhancements provide:

1. **Auto-discovery** of MCP servers from Claude Desktop and other sources
2. **Cortex-as-MCP-server** exposing pipelines to external agents
3. **Security hardening** with multi-layer validation and audit logging
4. **Langfuse observability** for comprehensive LLM tracing

---

## Phase 0.4: MCP Auto-Discovery

**File:** `src/lib/server/mcp/McpDiscoveryService.ts`

### Features

The McpDiscoveryService automatically discovers MCP servers from multiple sources:

| Source | Description |
|--------|-------------|
| **Claude Desktop** | Reads `claude_desktop_config.json` for configured MCP servers |
| **Local** | Scans `~/.mcp`, `~/.local/share/mcp`, and project directories |
| **Registry** | Fetches server definitions from remote registry URLs |
| **Custom** | User-defined server configurations |
| **Builtin** | Pre-configured servers from `MCP_SERVER_DIRECTORY` |

### Cross-Platform Support

Configuration paths are automatically detected:

```
macOS:    ~/Library/Application Support/Claude/claude_desktop_config.json
Windows:  %APPDATA%\Claude\claude_desktop_config.json
Linux:    ~/.config/claude/claude_desktop_config.json
```

### API Usage

```typescript
import { getMcpDiscoveryService } from '$lib/server/mcp/McpDiscoveryService.js';

const discovery = getMcpDiscoveryService();

// Run full discovery
const result = await discovery.discover();
console.log(`Found ${result.servers.length} servers`);

// Add a discovered server to active configuration
await discovery.addServer('claude-filesystem', { timeout: 30000 });

// Get servers by source
const claudeServers = discovery.getServersBySource('claude-desktop');
```

### Discovery Result

```typescript
interface DiscoveryResult {
  servers: DiscoveredServer[];
  errors: Array<{ source: string; error: string }>;
  timestamp: string;
}

interface DiscoveredServer {
  id: string;
  name: string;
  description: string;
  source: 'claude-desktop' | 'local' | 'registry' | 'custom' | 'builtin';
  protocol: 'stdio' | 'http' | 'websocket';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  category: 'file-system' | 'database' | 'web' | 'cloud' | 'ai' | 'communication' | 'development' | 'custom';
  tools?: Array<{ name: string; description?: string }>;
  alreadyConfigured?: boolean;
}
```

---

## Phase 0.5: Cortex-as-MCP-Server

**File:** `src/lib/server/mcp/McpServerBridge.ts`

### Overview

The McpServerBridge exposes Cortex Flow pipelines as an MCP server that external agents (like Claude Desktop) can call. It implements JSON-RPC 2.0 and supports both stdio and HTTP protocols.

### Available Tools

| Tool | Description |
|------|-------------|
| `execute_pipeline` | Run a Cortex Flow pipeline by ID |
| `list_pipelines` | List available pipelines |
| `query_knowledge` | Query Cortex Brain knowledge base |
| `get_execution_status` | Check pipeline execution status |

### Protocol Support

**Stdio Mode** (for Claude Desktop integration):
```bash
# Start as stdio server
node dist/startMcpServer.js --mode stdio
```

**HTTP Mode** (for remote access):
```bash
# Start as HTTP server on port 3100
node dist/startMcpServer.js --mode http --port 3100
```

### Configuration

```typescript
interface McpServerBridgeConfig {
  name?: string;              // Server name (default: "Cortex Flow MCP Server")
  version?: string;           // Server version
  mode: 'stdio' | 'http';     // Protocol mode
  port?: number;              // HTTP port (default: 3100)
  host?: string;              // HTTP host (default: 127.0.0.1)
  enabledTools?: string[];    // Subset of tools to expose
  authToken?: string;         // Bearer token for HTTP auth
}
```

### API Usage

```typescript
import { getMcpServerBridge } from '$lib/server/mcp/McpServerBridge.js';

const bridge = getMcpServerBridge({
  mode: 'http',
  port: 3100,
  authToken: 'secret-token',
  enabledTools: ['execute_pipeline', 'query_knowledge']
});

await bridge.start();
console.log(bridge.getStatus());
```

### MCP Protocol Methods

| Method | Description |
|--------|-------------|
| `initialize` | Server handshake with capabilities |
| `tools/list` | List available tools |
| `tools/call` | Execute a tool |
| `resources/list` | List resources (future) |
| `shutdown` | Stop the server |

---

## Phase 0.6: Security Hardening

### McpSecurityManager

**File:** `src/lib/server/mcp/McpSecurityManager.ts`

Provides security controls for MCP tool execution:

| Feature | Description |
|---------|-------------|
| **Allowlisting** | Server and tool allowlists with wildcard support |
| **Rate Limiting** | Global and per-server call limits |
| **Sanitization** | Input parameter and output sanitization |
| **Audit Logging** | Comprehensive logging with filtering |

#### Configuration

```typescript
interface McpSecurityConfig {
  allowlist: {
    enabled: boolean;
    servers: string[];    // ['*', 'github-*', 'brave-search']
    tools: string[];      // ['*', 'read_*', 'search']
  };
  rateLimit: {
    enabled: boolean;
    maxCallsPerMinute: number;    // Default: 60
    maxCallsPerServer: number;    // Default: 30
  };
  sandbox: {
    enabled: boolean;
    timeout: number;              // Default: 30000ms
    maxOutputSize: number;        // Default: 1MB
  };
  audit: {
    enabled: boolean;
    logLevel: 'minimal' | 'standard' | 'verbose';
  };
}
```

#### Usage

```typescript
import { getMcpSecurityManager } from '$lib/server/mcp/McpSecurityManager.js';

const security = getMcpSecurityManager({
  allowlist: { servers: ['filesystem', 'brave-*'], tools: ['read_*', 'search'] },
  rateLimit: { maxCallsPerMinute: 100 }
});

// Pre-execution check
const result = await security.preExecutionCheck(
  'filesystem',
  'read_file',
  { path: '/etc/hosts' },
  { userId: 'user123' }
);

if (!result.allowed) {
  console.log('Blocked:', result.reason);
}
```

#### Injection Detection

The security manager detects and flags potential prompt injection patterns:

```typescript
// Detected patterns include:
- [SYSTEM], [INST], <|system|>     // Direct instruction injection
- ignore previous instructions     // Role manipulation
- base64: [long encoded data]      // Encoded payloads
- ../../etc/passwd                 // Path traversal
- $(command)                       // Shell injection
```

### McpGuardian

**File:** `src/lib/server/mcp/McpGuardian.ts`

Multi-level validation system for MCP tool responses:

| Level | Name | Description |
|-------|------|-------------|
| **L1** | Basic | Size limits, format checks, structural validation |
| **L2** | Semantic | Pattern detection for injection, exfiltration, escalation |
| **L3** | Deep | Tool chain analysis, lookalike detection (optional) |

#### Risk Categories

```typescript
const SEMANTIC_RISK_PATTERNS = {
  instructionInjection: [...],   // Weight: 30
  roleManipulation: [...],       // Weight: 25
  dataExfiltration: [...],       // Weight: 35
  privilegeEscalation: [...],    // Weight: 40
  toolChainManipulation: [...],  // Weight: 30
  sensitiveData: [...],          // Weight: 20
};
```

#### Usage

```typescript
import { getMcpGuardian } from '$lib/server/mcp/McpGuardian.js';

const guardian = getMcpGuardian({
  defaultLevel: 'L2',
  l3: { enabled: true, sensitiveTools: ['execute_command', 'write_file'] }
});

const validation = await guardian.validate(toolOutput, {
  serverId: 'filesystem',
  toolName: 'read_file',
  level: 'L2',
  context: { sessionId: 'session123', previousTools: [...] }
});

console.log('Risk Score:', validation.metadata.riskScore);
if (!validation.valid) {
  console.log('Failed at:', validation.failed);
}
```

#### Tool Chain Analysis

L3 validation detects dangerous tool combinations:

```typescript
// Dangerous combinations detected:
- read_file -> send_email           // Data exfiltration
- list_directory -> read_file -> http_request   // Data theft
- execute_command x3                // Script execution
```

---

## Phase 1: Langfuse Observability

### Overview

Langfuse observability provides comprehensive tracing for LLM executions across all AI executors.

### Files Created

| File | Purpose |
|------|---------|
| `src/lib/server/observability/LangfuseClient.ts` | Core Langfuse client wrapper |
| `src/lib/server/observability/ObservabilityHooks.ts` | Executor event interface |
| `src/lib/server/observability/index.ts` | Module exports |

### Instrumented Executors

| Executor | Tracked Events |
|----------|----------------|
| **CortexFlowExecutor** | Execution, generations, tools, phases |
| **DebateExecutor** | Claude/OpenAI/Gemini calls, debate phases |
| **MultiAgentExecutor** | Agent generations, orchestrator tools |

### Hook Events

```typescript
interface ExecutorObservabilityHooks {
  onExecutionStart(data: ExecutionStartData): void;
  onGeneration(data: GenerationData): void;
  onToolStart(toolName: string, params: any): void;
  onToolEnd(toolName: string, result: any, success: boolean, duration: number): void;
  onPhaseChange(phase: string, detail?: string): void;
  onExecutionEnd(data: ExecutionEndData): void;
  onEvent(name: string, data: any): void;
  onEvaluation(data: EvaluationData): void;
}
```

### Usage

```typescript
import { createObservabilityHooks } from '$lib/server/observability/index.js';

// Initialize hooks for an execution
const hooks = createObservabilityHooks(executionId, 'claude', {
  pipelineId: 'pipeline-123',
  userId: 'user-456',
  tags: ['production', 'claude-3-opus']
});

// Start trace
hooks.onExecutionStart({
  executionId,
  frameworkId: 'claude',
  model: 'claude-3-opus',
  prompt: 'Analyze this data...'
});

// Track LLM generation
hooks.onGeneration({
  model: 'claude-3-opus',
  input: messages,
  output: response,
  inputTokens: 1500,
  outputTokens: 800,
  duration: 2340
});

// Track tool execution
hooks.onToolStart('WebFetch', { url: 'https://...' });
hooks.onToolEnd('WebFetch', result, true, 1200);

// End trace
hooks.onExecutionEnd({
  success: true,
  output: results,
  stats: { inputTokens, outputTokens, toolCalls, duration }
});
```

### Langfuse Dashboard

With Langfuse observability enabled, you can:

- View execution traces with full context
- Monitor token usage and costs
- Track tool call patterns
- Analyze latency distributions
- Set up quality evaluations

---

## API Endpoints

### Discovery Endpoint

```
POST /api/mcp/discover
```

Triggers MCP server discovery and returns found servers.

### Security Endpoint

```
GET /api/mcp/security/status
POST /api/mcp/security/config
GET /api/mcp/security/audit
```

View security status, update configuration, and query audit logs.

### Server Bridge Endpoint

```
POST /api/mcp/server
{
  "action": "start" | "stop" | "status",
  "config": McpServerBridgeConfig
}
```

Manage the MCP server bridge.

---

## Configuration Files

### mcp-config.json

Place in project root or `~/.config/cortex-flow/`:

```json
{
  "discovery": {
    "enabled": true,
    "sources": [
      { "type": "claude-desktop" },
      { "type": "local", "patterns": ["@modelcontextprotocol/*"] },
      { "type": "registry", "url": "https://mcp-registry.example.com/servers" }
    ]
  },
  "defaults": {
    "timeout": 30000,
    "retryAttempts": 3
  }
}
```

---

## Architecture Diagram

```
                    ┌─────────────────────────────────────┐
                    │         External Agents             │
                    │   (Claude Desktop, Custom Agents)   │
                    └──────────────┬──────────────────────┘
                                   │ JSON-RPC 2.0
                                   ▼
┌──────────────────────────────────────────────────────────────┐
│                    McpServerBridge                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   stdio     │  │    HTTP     │  │   Tool Handlers     │  │
│  │   Server    │  │   Server    │  │  (execute_pipeline) │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────┐
│                   Security Layer                             │
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │ McpSecurityMgr   │  │        McpGuardian               │ │
│  │ - Allowlisting   │  │ - L1: Basic validation           │ │
│  │ - Rate limiting  │  │ - L2: Semantic analysis          │ │
│  │ - Audit logging  │  │ - L3: Tool chain reasoning       │ │
│  └──────────────────┘  └──────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────┐
│                   Cortex Flow Executors                      │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐   │
│  │CortexFlowExec  │ │ DebateExecutor │ │MultiAgentExec  │   │
│  │ + Observability│ │ + Observability│ │ + Observability│   │
│  └────────────────┘ └────────────────┘ └────────────────┘   │
└──────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────┐
│                   MCP Discovery                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ McpDiscoveryService                                     ││
│  │ Sources: Claude Desktop | Local | Registry | Custom     ││
│  └─────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────┐
│              External MCP Servers                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │Filesystem│ │  Brave   │ │  GitHub  │ │ Puppeteer│ ...   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└──────────────────────────────────────────────────────────────┘
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.4 | 2026-01 | MCP Auto-Discovery Service |
| 0.5 | 2026-01 | Cortex-as-MCP-Server Bridge |
| 0.6 | 2026-01 | Security hardening (McpSecurityManager, McpGuardian) |
| 1.0 | 2026-01 | Langfuse Observability Integration |

---

## Related Documentation

- [Phase 4: MCP Server Integration](./PHASE4_MCP_SERVER_INTEGRATION.md)
- [Cortex Flow Architecture](./CORTEX_KNOWLEDGE_SYSTEM_ARCHITECTURE.md)
