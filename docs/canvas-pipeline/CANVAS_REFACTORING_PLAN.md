# DataManagementCanvas Refactoring Plan

## Current Structure

**File:** `DataManagementCanvas.svelte` (11,235 lines, 484KB)

The file has three main snippet sections:
1. **toolbarContent()** - Line 8426-8477 (~50 lines)
2. **nodesContent()** - Line 8478-10453 (~2,000 lines)
3. **tabContent()** - Line 10454+ (~800 lines)

Plus ~8,400 lines of script including:
- **158 functions**
- **120+ state variables**
- **40+ icon imports**

---

## Strategy: Component Extraction with Encapsulation

Instead of passing functions as props, we'll:
1. **Move functions INTO components** that use them
2. **Use events** for parent-child communication
3. **Lazy load** heavy components
4. **Share state** via stores or context when needed

---

## Phase 1: Extract Toolbar Component

### Current Functions Used by Toolbar (in parent):
```typescript
// Pipeline operations
newPipeline() - line 1998
savePipeline() - line 2009
openSaveModal() - line 2145
openLoadModal() - line 2151
clearCanvas() - line 2215
resetAllNodes() - line 2238
autoLayout() - line 2254
toggleCurrentPipelineAsDefault() - line 1961

// Debug operations
openDebugConsole() - inline arrow function
closeDebugConsole() - line 6951
loadServerDebugFor() - line 6962
```

### Refactored: CanvasToolbar.svelte

**Props IN:**
```typescript
{
  activeMgmtTab: 'nodes' | 'credentials' | 'administration',
  showAdminButton: boolean,
  showSavedFeedback: boolean,
  debugConsoleOpen: boolean,
  hasRun: boolean,
  currentPipelineId: string | null,
  isDefault: boolean
}
```

**Events OUT:**
```typescript
dispatch('new-pipeline')
dispatch('save-pipeline', { isShiftKey: boolean })
dispatch('load-pipeline')
dispatch('clear-canvas')
dispatch('reset-nodes')
dispatch('auto-layout')
dispatch('toggle-debug')
dispatch('toggle-default')
dispatch('tab-change', { tab: string })
```

**Internal Functions (moved from parent):**
- None needed - just dispatches events

**Savings:** ~200 lines from parent, ~50 lines toolbar markup

---

## Phase 2: Extract Left Sidebar (Nodes Panel)

### Current Functions Used by Sidebar (in parent):
```typescript
// Node operations
addNode(type) - line 2332
loadExecutionsForPipeline() - line 2067
expandAllExecGroups() - line 2058
collapseAllExecGroups() - line 2062
toggleExecGroupExpanded(runId) - line 2046
deleteExecution(id) - line 2102
openExecDetailsAtEvent(ev) - line 159
handleExecScroll() - inline
```

### Refactored: CanvasSidebar.svelte

**Props IN:**
```typescript
{
  leftPanelMode: 'nodes' | 'executions',
  currentPipelineId: string | null,
  execGroups: ExecGroup[],
  ungroupedExecs: Execution[],
  isLoadingExecList: boolean
}
```

**Events OUT:**
```typescript
dispatch('add-node', { nodeType: string })
dispatch('mode-change', { mode: 'nodes' | 'executions' })
dispatch('load-executions')
dispatch('expand-all')
dispatch('collapse-all')
dispatch('toggle-group', { runId: string })
dispatch('delete-execution', { id: string })
dispatch('view-execution-details', { event: object })
```

**Internal Functions (moved from parent):**
- Node type metadata (colors, icons, descriptions)
- Execution list rendering logic
- Scroll handling
- Group expand/collapse state management

**Child Components:**
- `NodeTypePanel.svelte` - Node type buttons with metadata
- `ExecutionsPanel.svelte` - Execution list with grouping

**Savings:** ~400 lines from parent, ~1,600 lines sidebar markup

---

## Phase 3: Extract Node Rendering

### Current: Giant Switch Statement (lines 9500-10400)

**Pattern:**
```svelte
{#if node.type === 'data-source'}
  <!-- 200 lines of data-source rendering -->
{:else if node.type === 'code'}
  <!-- 300 lines of code node rendering -->
{:else if node.type === 'expert'}
  <!-- 120 lines of expert rendering -->
{:else if node.type === 'webhook'}
  <!-- 180 lines of webhook rendering -->
{:else}
  <!-- 100 lines of standard rendering -->
{/if}
```

### Refactored: NodeRenderer.svelte + Specialized Components

**NodeRenderer.svelte** (smart component)
```svelte
<script>
  import { lazy } from 'svelte';

  const displays = {
    'data-source': lazy(() => import('./nodes/DataSourceNode.svelte')),
    'code': lazy(() => import('./nodes/CodeNode.svelte')),
    'expert': lazy(() => import('./nodes/ExpertNode.svelte')),
    'webhook': lazy(() => import('./nodes/WebhookNode.svelte')),
    'data-grid': lazy(() => import('./nodes/DataGridNode.svelte')),
    // ... more
  };
</script>

{#if displays[node.type]}
  <svelte:component this={displays[node.type]} {node} ... />
{:else}
  <StandardNode {node} ... />
{/if}
```

### Specialized Node Components

Each node component encapsulates its own logic:

**CodeNode.svelte:**
```typescript
// Internal functions (moved from parent):
- copyCodeToClipboard()
- formatCode()
- validateSyntax()
- runCodeTest()
- handleEditorChange()

// Events OUT:
dispatch('config-change', { nodeId, config })
dispatch('test-started', { nodeId })
dispatch('open-settings', { nodeId })
```

**DataSourceNode.svelte:**
```typescript
// Internal functions:
- formatLastExecution()
- getConnectionStatus()

// Events OUT:
dispatch('config-change', { nodeId, config })
dispatch('open-settings', { nodeId })
```

**ExpertNode.svelte:**
```typescript
// Internal functions:
- getStatusColor()
- formatLastAnswer()

// Events OUT:
dispatch('config-change', { nodeId, config })
dispatch('open-settings', { nodeId })
```

**WebhookNode.svelte:**
```typescript
// Internal functions:
- getMethodColor()
- calculatePortPositions()
- handlePortClick()

// Events OUT:
dispatch('port-mousedown', { nodeId, port, event })
dispatch('port-mouseup', { nodeId, port, event })
dispatch('config-change', { nodeId, config })
```

**Savings:** ~1,000 lines from parent, better organization

---

## Phase 4: Extract Credentials Management

### Current Functions (in parent):
```typescript
// LLM credentials (lines 700-890)
newLlm() - line 851
editLlm(id) - line 858
duplicateLlm(id) - line 867
deleteLlm(id) - implicit
testLlm(id) - inline
afterLlmSaved() - line 866
loadLlmModels(credId) - line 713

// Mongo credentials (lines 900-1280)
newMongo() - line 949
editMongo(id) - line 976
deleteMongo(id) - line 1007
duplicateMongo(id) - line 1013
testMongo() - line 1047
testMongoCredential(cred) - line 1183

// Postgres credentials (lines 1280-1410)
newPostgres() - line 1282
editPostgres(id) - line 1288
deletePostgres(id) - line 1296
duplicatePostgres(id) - line 1302
testPostgres() - line 1323
```

### Refactored: CredentialsManager.svelte

**Props IN:**
```typescript
{
  llmList: LlmCredential[],
  mongoList: MongoCredential[],
  postgresList: PostgresCredential[]
}
```

**Events OUT:**
```typescript
dispatch('credentials-changed')
dispatch('credential-selected', { type, id })
```

**Internal Components:**
- `LlmCredentialsList.svelte` - Encapsulates ALL LLM operations
- `MongoCredentialsList.svelte` - Encapsulates ALL Mongo operations
- `PostgresCredentialsList.svelte` - Encapsulates ALL Postgres operations

**Each credential component manages:**
- CRUD operations (new, edit, delete, duplicate)
- Testing connections
- Loading models (for LLM)
- Inline forms
- Validation

**Savings:** ~600 lines from parent, cleaner separation

---

## Phase 5: Extract Tab Management

### Current: Inline Tab Content (lines 10454+)

**Refactored Structure:**
```
src/lib/components/canvas/tabs/
├── NodesTab.svelte (already exists - enhance)
├── CredentialsTab.svelte (already exists - enhance)
├── AdministrationTab.svelte (already exists - enhance)
```

**Current Problems:**
- Tabs are imported but content is mostly inline
- Functions are in parent
- State is scattered

**Solution:**
- Move ALL tab-specific state into tab components
- Move ALL tab-specific functions into tab components
- Use events for cross-tab communication

**Savings:** ~200 lines from parent

---

## Phase 6: State Management Strategy

### Shared State (Keep in Parent or Store)
```typescript
// Canvas state
nodes: Node[]
connections: Connection[]
selectedNode: Node | null
viewportManager: ViewportManager
selectionManager: SelectionManager

// Pipeline state
currentPipelineId: string | null
savedPipelines: Pipeline[]
defaultPipelineId: string | null

// Execution state
isExecuting: boolean
runPanel: RunPanel
execGroups: ExecGroup[]

// UI state
activeMgmtTab: 'nodes' | 'credentials' | 'administration'
leftPanelMode: 'nodes' | 'executions'
```

### Local State (Move to Components)
```typescript
// Toolbar
showSavedFeedback: boolean

// Sidebar
execListLoading: boolean
expandedGroups: Set<string>

// Credentials
editingCredentialId: string | null
testingCredentialId: string | null
llmModelsLoading: Record<string, boolean>
inlineConsoleLogs: Record<string, any[]>

// Nodes
codeCopied: Record<string, boolean>
codeTestRunning: Record<string, boolean>
```

---

## Implementation Order

### Sprint 1: Core Extraction (High Impact, Low Risk)
1. ✅ **Extract CanvasToolbar.svelte** (1 hour)
   - Simple event-based component
   - No complex state
   - Immediate ~200 line reduction

2. ✅ **Extract CanvasSidebar.svelte** (2 hours)
   - Node type panel
   - Executions panel
   - ~400 line reduction

3. ✅ **Extract NodeRenderer + 3 Node Types** (3 hours)
   - StandardNode, DataSourceNode, CodeNode
   - ~500 line reduction
   - Foundation for remaining nodes

**Sprint 1 Total:** ~1,100 lines removed, ~6 hours

### Sprint 2: Specialized Nodes (Medium Impact)
4. **Extract Remaining Node Types** (4 hours)
   - ExpertNode, WebhookNode, DataGridNode
   - ChartNode, BufferNode, GroupNode
   - ~500 line reduction

5. **Extract CredentialsManager** (3 hours)
   - LlmCredentialsList
   - MongoCredentialsList
   - PostgresCredentialsList
   - ~600 line reduction

**Sprint 2 Total:** ~1,100 lines removed, ~7 hours

### Sprint 3: Polish & Optimize (Low Impact)
6. **Enhance Tab Components** (2 hours)
   - Move remaining tab logic
   - ~200 line reduction

7. **Extract Utility Services** (2 hours)
   - pipelineOperations.ts
   - nodeOperations.ts
   - executionMonitoring.ts
   - ~300 line reduction

**Sprint 3 Total:** ~500 lines removed, ~4 hours

---

## Expected Results

### Before Refactoring
- **Main file:** 11,235 lines, 484KB
- **Functions:** 158 in parent
- **State:** 120+ variables in parent
- **Parse time:** 10+ seconds (before lazy load fix)
- **Maintainability:** Very poor
- **Testability:** Very difficult

### After Refactoring
- **Main file:** ~3,500 lines, ~150KB
  - Orchestration logic only
  - Shared state management
  - Component lifecycle
  - Canvas interaction handling

- **New Components:** 15-20 focused components
  - CanvasToolbar.svelte (~150 lines)
  - CanvasSidebar.svelte (~300 lines)
  - NodeRenderer.svelte (~100 lines)
  - 8 x Node components (~150 lines each = 1,200 lines)
  - CredentialsManager.svelte (~200 lines)
  - 3 x Credential list components (~200 lines each = 600 lines)
  - Tab enhancements (~200 lines)

- **Parse time:** <1 second (with lazy loading)
- **Bundle size:** ~800KB total (split across chunks)
- **Maintainability:** Excellent
- **Testability:** Each component independently testable

### Metrics
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Main file LOC | 11,235 | ~3,500 | -69% |
| Main file size | 484KB | ~150KB | -69% |
| Components | 1 monolith | 20+ focused | ✅ |
| Functions/component | 158 | ~10-15 | -90% |
| State/component | 120+ | ~20-30 | -75% |
| Parse time | 10s | <1s | -90% |
| Testability | ❌ | ✅ | Excellent |

---

## Migration Strategy

### Backward Compatibility
Each extraction maintains full backward compatibility:
1. Extract component
2. Test in isolation
3. Replace inline code with component
4. Verify functionality
5. Remove old code

### Event Naming Convention
```typescript
// Pattern: <action>-<resource>
dispatch('add-node', { type })
dispatch('save-pipeline', { isShiftKey })
dispatch('delete-execution', { id })
dispatch('config-change', { nodeId, config })
dispatch('tab-change', { tab })
```

### Testing Strategy
Each component gets:
1. **Unit tests** - Functions work correctly
2. **Integration tests** - Events dispatch correctly
3. **Visual tests** - Renders as expected
4. **E2E tests** - Full workflow works

---

## Next Steps

1. **Review & Approve Plan** - Stakeholder sign-off
2. **Start Sprint 1** - Toolbar extraction
3. **Measure Impact** - Bundle size, parse time
4. **Iterate** - Adjust plan based on learnings

---

## Risk Mitigation

### Risks
1. Breaking existing functionality
2. Event handling bugs
3. State synchronization issues
4. Performance regression

### Mitigations
1. ✅ Comprehensive testing at each step
2. ✅ Feature flags for gradual rollout
3. ✅ Maintain parallel old/new code paths
4. ✅ Performance benchmarking
5. ✅ Easy rollback via git

---

## Success Criteria

✅ Main file < 4,000 lines
✅ No single component > 500 lines
✅ Parse time < 1 second
✅ Bundle size < 1MB total
✅ All existing features work
✅ No performance regression
✅ 80%+ test coverage on new components
