# Cortex Flow Phase 3: Advanced Tools Foundation

## Overview

Phase 3 establishes the foundation for extensible tool architecture in Cortex Flow, enabling advanced tool categories beyond the core tools. This creates a VS Code extension-style system for managing and enabling specialized tools.

## What This Foundation Provides

### 1. **Comprehensive Tool Type System**
The `advancedTools.ts` file defines the complete type system for advanced tools:

- **Tool Categories**: code-execution, data-analytics, ai-enhancement, document-processing, research-knowledge, external-services, development, mcp-server, regno
- **Execution Configs**: Built-in handlers, HTTP API, Docker containers, MCP servers
- **Risk Levels**: safe, moderate, dangerous
- **Tool Examples**: Documentation with input/output examples

### 2. **Pre-defined Tool Catalog**
17+ advanced tools are pre-defined and ready for implementation:

| Category | Tools |
|----------|-------|
| **Code Execution** | Python Exec, SQL Query |
| **Data Analytics** | DataFrame Analyze, Chart Generate |
| **AI Enhancement** | Image Generate, Image Analyze, OCR, Embeddings |
| **Document Processing** | PDF Parse, PDF Generate, Excel Process |
| **Research & Knowledge** | arXiv Search, Wikipedia Query, News Aggregate |
| **External Services** | Email Send, Slack Post |
| **Regno.ai** | Doc Library, Cortex Pattern, Cortex, Knowledge Base |

### 3. **VS Code Extension-Style UI**
The `AdvancedToolsPanel.svelte` component provides a professional interface for managing tools:

- **Category Sidebar**: Filter tools by category
- **Search Functionality**: Find tools by name or description
- **Tool Cards Grid**: Visual display of all available tools
- **Detail Panel**: Full tool information with:
  - Risk level and requirements
  - Input schema with parameter descriptions
  - Usage examples
  - Enable/disable controls
  - Test functionality

### 4. **Tool Registry**
The `ToolRegistry.ts` provides centralized tool management:

- Dynamic tool registration
- Category-based organization
- Enable/disable tracking
- Tool definition generation for Claude API
- Integration with user configurations

---

## Tool Categories Explained

### Code Execution
Tools for running code in sandboxed environments:
- **Python Exec**: Execute Python for calculations, data analysis, scripting
- **SQL Query**: Run queries against configured databases

### Data Analytics
Tools for data analysis and visualization:
- **DataFrame Analyze**: Pandas-style operations on CSV/JSON data
- **Chart Generate**: Create D3/Chart.js visualizations

### AI Enhancement
Tools that leverage AI models:
- **Image Generate**: DALL-E/Stability AI image generation
- **Image Analyze**: Vision model analysis
- **OCR**: Text extraction from images
- **Embeddings**: Text embedding generation

### Document Processing
Tools for working with documents:
- **PDF Parse**: Extract text and images from PDFs
- **PDF Generate**: Create PDFs from HTML/Markdown
- **Excel Process**: Read/write/analyze spreadsheets

### Research & Knowledge
Tools for information gathering:
- **arXiv Search**: Academic paper search
- **Wikipedia Query**: Factual information lookup
- **News Aggregate**: Multi-source news search

### External Services
Tools for external integrations:
- **Email Send**: SMTP/API email sending
- **Slack Post**: Slack channel messaging

### Regno.ai Internal
Regno.ai platform-specific tools:
- **Doc Library**: Search platform documentation
- **Cortex Pattern**: Query pattern knowledge base
- **Cortex**: Advanced knowledge operations
- **Knowledge Base**: Semantic search across memories

---

## Settings Integration

### Location in UI
**Settings > Tools > Advanced**

### Tool Configuration
Each tool can be individually configured:

```typescript
interface AdvancedToolConfig {
  toolId: string;
  enabled: boolean;
  customConfig?: Record<string, unknown>;
  credentialId?: string;
}
```

### Settings Structure
Tools are stored in the `advancedTools` array within settings:

```typescript
{
  // ... other settings
  advancedTools: [
    { toolId: 'python-exec', enabled: true },
    { toolId: 'arxiv-search', enabled: true },
    { toolId: 'pdf-parse', enabled: true }
  ]
}
```

---

## Risk Levels

### Safe
- No external access
- Sandboxed execution
- No approval required
- Examples: DataFrame Analyze, Chart Generate

### Moderate
- External API access
- Requires credentials
- Monitored execution
- Examples: Web Search, SQL Query, Email Send

### Dangerous
- System-level access
- Requires explicit approval
- Logged operations
- Examples: Bash with elevated permissions

---

## Files Created/Modified

### New Files
- `src/lib/types/advancedTools.ts` - Complete type system and tool definitions
- `src/lib/server/cortex-flow/ToolRegistry.ts` - Tool registration and management
- `src/lib/components/cortex-flow/AdvancedToolsPanel.svelte` - VS Code-style UI

### Modified Files
- `src/lib/components/cortex-flow/CortexFlowSettingsModal.svelte` - Added Advanced Tools tab

---

## Using the Advanced Tools Panel

### Browsing Tools
1. Open Settings modal
2. Go to Tools tab
3. Select "Advanced" sub-tab
4. Browse by category or search

### Enabling a Tool
1. Click on a tool card
2. Review tool details and requirements
3. Click "Enable Tool" button
4. Configure credentials if required

### Testing a Tool
1. Select an enabled tool
2. Click "Test Tool" in the detail panel
3. Enter test input JSON
4. Click "Run Test"
5. Review results

---

## Future Implementation Roadmap

### Phase 3a: Priority Tool Implementations
1. **Python Exec** - Sandboxed Python execution
2. **Image Analyze** - Vision model integration
3. **PDF Parse** - Document extraction
4. **SQL Query** - Database connectivity

### Phase 3b: MCP Server Integration
1. Connect to external MCP servers
2. Dynamic tool discovery
3. Authentication handling

### Phase 3c: Extended Tools
1. Additional research tools (Patents, Scholar)
2. More external services (Notion, Calendar)
3. Custom tool creation API

---

## API Endpoints (Future)

```typescript
// Test a tool
POST /api/cortex-flow/tools/test
{
  toolId: string;
  input: Record<string, unknown>;
}

// Get tool status
GET /api/cortex-flow/tools/status/:toolId

// Execute tool directly
POST /api/cortex-flow/tools/execute
{
  toolId: string;
  input: Record<string, unknown>;
  credentialId?: string;
}
```

---

## Verification Checklist

1. **UI Rendering**
   - [ ] Advanced Tools sub-tab appears in Settings > Tools
   - [ ] All categories display correctly
   - [ ] Tool cards render with proper styling
   - [ ] Detail panel shows complete information

2. **Tool Management**
   - [ ] Tools can be enabled/disabled via toggle
   - [ ] Configuration persists across sessions
   - [ ] Search filters tools correctly
   - [ ] Category filtering works

3. **Settings Integration**
   - [ ] advancedTools array saved to settings
   - [ ] Settings load correctly on modal open
   - [ ] Changes persist after save

---

## Version History

- **v1.0** (Phase 3) - Foundation: Type system, UI panel, tool registry structure

