# Cortex Flow Phase 3: Priority Tools Implementation

## Overview

Phase 3 implements the priority built-in tools for Cortex Flow, providing powerful research, code execution, and AI enhancement capabilities.

## Implemented Tools

### 1. WikipediaQuery Tool

**Category:** Research & Knowledge
**Handler:** `WikipediaQueryTool`
**File:** `src/lib/server/cortex-flow/tools/WikipediaQueryTool.ts`

Query Wikipedia for factual information with three modes:
- **search**: Search for articles matching a query
- **summary**: Get the introduction/summary of a specific article
- **full**: Get the full article content

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| query | string | Yes | - | Search query or article title |
| action | string | No | 'search' | 'search', 'summary', or 'full' |
| limit | number | No | 3 | Number of search results (1-10) |
| language | string | No | 'en' | Wikipedia language code |

**Example Usage:**
```json
{
  "query": "quantum computing",
  "action": "search",
  "limit": 5
}
```

---

### 2. ArxivSearch Tool

**Category:** Research & Knowledge
**Handler:** `ArxivSearchTool`
**File:** `src/lib/server/cortex-flow/tools/ArxivSearchTool.ts`

Search academic papers on arXiv.org with full metadata extraction.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| query | string | Yes | - | Search query |
| max_results | number | No | 5 | Maximum results (1-20) |
| sort_by | string | No | 'relevance' | 'relevance', 'lastUpdatedDate', 'submittedDate' |
| sort_order | string | No | 'descending' | 'ascending' or 'descending' |
| category | string | No | - | arXiv category filter (e.g., 'cs.AI') |

**Example Usage:**
```json
{
  "query": "transformer architecture neural networks",
  "max_results": 5,
  "category": "cs.AI"
}
```

**Returns:**
- Paper titles, authors, abstracts
- Publication dates
- arXiv IDs and categories
- PDF and abstract links

---

### 3. PythonExec Tool

**Category:** Code Execution
**Handler:** `PythonExecTool`
**File:** `src/lib/server/cortex-flow/tools/PythonExecTool.ts`

Execute Python code in a sandboxed environment for calculations, data analysis, and scripting.

**Security Features:**
- Blocked dangerous modules: `os`, `subprocess`, `sys`, `shutil`, `socket`
- Blocked dangerous functions: `eval`, `exec`, `compile`, `__import__`
- No write file access
- 30-second default timeout
- 50KB output limit
- Restricted builtins

**Allowed Safe Modules:**
- Math: `math`, `statistics`, `decimal`, `fractions`, `random`
- Data: `collections`, `itertools`, `functools`, `operator`
- Text: `json`, `re`, `string`, `textwrap`
- Types: `typing`, `dataclasses`, `enum`
- Scientific: `numpy`, `pandas`, `scipy`, `matplotlib`, `seaborn` (if installed)

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| code | string | Yes | - | Python code to execute |
| timeout | number | No | 30000 | Execution timeout in ms (max 60000) |

**Example Usage:**
```json
{
  "code": "import math\nresult = math.sqrt(144)\nprint(f'Square root: {result}')",
  "timeout": 10000
}
```

---

### 4. ImageAnalyze Tool

**Category:** AI Enhancement
**Handler:** `ImageAnalyzeTool`
**File:** `src/lib/server/cortex-flow/tools/ImageAnalyzeTool.ts`

Analyze images using vision models (Claude or OpenAI) to extract information.

**Image Sources (provide one):**
- `image_path`: Local file path
- `image_url`: URL to fetch
- `image_base64`: Base64-encoded data

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| image_path | string | No* | - | Local file path |
| image_url | string | No* | - | URL of the image |
| image_base64 | string | No* | - | Base64-encoded image |
| prompt | string | No | 'Describe this image in detail.' | Analysis prompt |
| detailed | boolean | No | true | Request detailed analysis |
| media_type | string | No | 'image/png' | Media type for base64 |

*One of image_path, image_url, or image_base64 is required.

**Supported Formats:** PNG, JPG, JPEG, GIF, WebP
**Max File Size:** 20MB

**Example Usage:**
```json
{
  "image_url": "https://example.com/chart.png",
  "prompt": "Extract all text and data from this chart"
}
```

---

## Architecture

### Tool Registration

Tools are registered through two mechanisms:

1. **Definition in `advancedTools.ts`:**
   - Tool metadata, input schema, category
   - Handler name for execution dispatch

2. **Implementation in `ToolRegistry.ts`:**
   - Import tool classes
   - Handler dispatch in `executeBuiltInAdvancedTool()`

### Execution Flow

```
User Request → Cortex Flow Executor
                      ↓
              Tool Registry
                      ↓
         executeAdvancedTool()
                      ↓
    Check enabled + auth requirements
                      ↓
       executeBuiltInAdvancedTool()
                      ↓
           Handler dispatch (switch)
                      ↓
           Tool.execute(params, settings)
                      ↓
              Return ToolResult
```

---

## Files Modified/Created

### New Files
- `src/lib/server/cortex-flow/tools/WikipediaQueryTool.ts`
- `src/lib/server/cortex-flow/tools/ArxivSearchTool.ts`
- `src/lib/server/cortex-flow/tools/PythonExecTool.ts`
- `src/lib/server/cortex-flow/tools/ImageAnalyzeTool.ts`

### Modified Files
- `src/lib/server/cortex-flow/ToolRegistry.ts`
  - Added imports for new tools
  - Implemented handler dispatch in `executeBuiltInAdvancedTool()`
- `src/lib/types/advancedTools.ts`
  - Updated input schemas for implemented tools
  - Added examples

---

## Enabling Tools

Advanced tools are disabled by default. To use them:

1. Open Cortex Flow Settings
2. Go to "Advanced Tools" tab
3. Find the tool in its category
4. Toggle enable
5. Configure any required credentials (e.g., API keys for ImageAnalyze)

---

## Testing

### Test via API

```bash
# Test WikipediaQuery
curl -X POST http://localhost:5173/api/cortex-flow/tools/test \
  -H "Content-Type: application/json" \
  -d '{"toolId": "wikipedia-query", "input": {"query": "artificial intelligence", "action": "summary"}}'

# Test ArxivSearch
curl -X POST http://localhost:5173/api/cortex-flow/tools/test \
  -H "Content-Type: application/json" \
  -d '{"toolId": "arxiv-search", "input": {"query": "large language models", "max_results": 3}}'

# Test PythonExec
curl -X POST http://localhost:5173/api/cortex-flow/tools/test \
  -H "Content-Type: application/json" \
  -d '{"toolId": "python-exec", "input": {"code": "print(2 + 2)"}}'
```

---

## Future Tools (Not Yet Implemented)

The following tools have definitions but no implementation yet:

### Code Execution
- SqlQuery - Database queries

### Data Analytics
- DataFrameAnalyze - Pandas-style analysis
- ChartGenerate - Visualization generation

### AI Enhancement
- ImageGenerate - DALL-E/Stability AI
- OCR - Text extraction from images
- Embeddings - Text embedding generation

### Document Processing
- PdfParse - PDF text extraction
- PdfGenerate - PDF creation
- ExcelProcess - Excel file handling

### External Services
- EmailSend - Email via SMTP/API
- SlackPost - Slack messaging
- NewsAggregate - News search

---

## Version History

- **v1.0** (Phase 3) - Initial implementation of priority tools:
  - WikipediaQuery
  - ArxivSearch
  - PythonExec
  - ImageAnalyze
