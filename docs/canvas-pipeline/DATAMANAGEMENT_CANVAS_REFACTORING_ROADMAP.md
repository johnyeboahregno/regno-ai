# DataManagementCanvas.svelte Refactoring Roadmap

**Status:** Planning Phase
**Current Size:** 10,916 lines
**Target Size:** ~2,500-3,000 lines (70-75% reduction)
**Date:** 2025-10-07

---

## Executive Summary

The DataManagementCanvas.svelte component has grown to over 10,000 lines and contains multiple distinct subsystems that should be extracted into separate, testable modules. This document outlines a phased approach to refactor the component while maintaining full backward compatibility and zero downtime.

---

## Current Architecture Analysis

### File Breakdown by Functional Area

| Area | Lines (Est.) | Complexity | Dependencies | Priority |
|------|--------------|------------|--------------|----------|
| **Viewport Management** | ~300 | Low | Canvas element | **Phase 1** |
| **Debug Panel System** | ~400 | Medium | Execution events | **Phase 2** |
| **Execution Management** | ~500 | High | Server API, SSE | **Phase 3** |
| **Selection & Interaction** | ~200 | Low | Mouse events | **Phase 1** |
| **Node Rendering** | ~800 | Medium | Node types | **Phase 2** |
| **Connection Rendering** | ~600 | Medium | Nodes, edges | **Phase 2** |
| **Credentials Management** | ~500 | Medium | Server API | **Phase 4** |
| **Resource Monitoring** | ~300 | Low | Server stats | **Phase 4** |
| **Group Management** | ~400 | Medium | Nodes, tabs | **Phase 3** |
| **Pipeline Persistence** | ~300 | Medium | Server API | **Phase 3** |
| **Modals & Dialogs** | ~1,500 | Low | Various | **Phase 4** |
| **Core Canvas Logic** | ~2,500 | High | Everything | **Always** |
| **Utilities & Helpers** | ~800 | Low | None | **Phase 1** |
| **Reactive Effects** | ~1,200 | High | State sync | **Phase 5** |
| **Event Handlers** | ~1,000 | Medium | DOM events | **Phase 2** |

---

## Phase 1: Foundation & Low-Hanging Fruit (Week 1)

**Goal:** Extract self-contained, low-dependency systems to establish patterns and reduce ~1,200 lines.

### 1.1 ViewportManager Class
**Extraction Target:** `src/lib/components/canvas/ViewportManager.ts`
**Lines Reduced:** ~300

**Responsibilities:**
- Pan/zoom state management
- Mouse wheel zoom handling
- Pan drag operations
- Viewport transformations (screen ↔ canvas coordinates)
- Fit operations (fitToContent, fitToSelection, autoFit)

**State to Extract:**
```typescript
class ViewportManager {
  zoom = $state(1);
  panX = $state(0);
  panY = $state(0);
  isPanning = $state(false);
  panMode = $state(false);
  panStart = $state({ x: 0, y: 0 });
  panOrigin = $state({ x: 0, y: 0 });
  wheelZoomEnabled = $state(true);

  // Methods
  zoomIn(): void
  zoomOut(): void
  resetView(): void
  handleWheel(e: WheelEvent): void
  handlePanMouseDown(e: MouseEvent): void
  handlePanMouseMove(e: MouseEvent): void
  handlePanMouseUp(): void
  fitToContent(nodes: Node[]): void
  fitToSelection(nodes: Node[]): void
  screenToCanvas(x: number, y: number): Point
  canvasToScreen(x: number, y: number): Point
}
```

**Benefits:**
- Zero external dependencies
- Easy to unit test
- Clear interface
- Reusable in other canvas components

---

### 1.2 SelectionManager Class
**Extraction Target:** `src/lib/components/canvas/SelectionManager.ts`
**Lines Reduced:** ~200

**Responsibilities:**
- Node/connection selection state
- Multi-select (marquee) operations
- Selection menu positioning
- Copy/paste selection operations

**State to Extract:**
```typescript
class SelectionManager {
  selectedNodeIds = $state<Set<string>>(new Set());
  selectedNode = $state<Node | null>(null);
  isMarqueeSelecting = $state(false);
  marqueeRect = $state<Rect | null>(null);
  marqueeStart = $state<Point | null>(null);
  showSelectionMenu = $state(false);
  selectionMenuPos = $state({ x: 0, y: 0 });

  // Methods
  selectNode(id: string): void
  deselectNode(id: string): void
  clearSelection(): void
  selectMultiple(ids: string[]): void
  startMarqueeSelect(point: Point): void
  updateMarqueeSelect(point: Point): void
  endMarqueeSelect(): string[]
  openSelectionMenu(pos: Point): void
  closeSelectionMenu(): void
  getSelectedSubgraph(): { nodes: Node[], connections: Connection[] }
  copySelection(): void
  pasteSelection(): void
}
```

**Benefits:**
- Clean separation of selection logic
- Testable selection algorithms
- Reusable for other graph components

---

### 1.3 Utility Functions Module
**Extraction Target:** `src/lib/components/canvas/canvasUtils.ts`
**Lines Reduced:** ~200

**Functions to Extract:**
- `generateId()` - UUID generation
- `getNodeColor()` - Node color lookup
- `getNodeIcon()` - Icon component lookup
- `getNodeTypeName()` - Display name lookup
- `fmtDateTime()` - Date formatting
- `fmtMs()` - Duration formatting
- `formatPct()` - Percentage formatting
- `getRoutedConnectionPath()` - SVG path calculation
- `getTempConnectionPath()` - Temporary connection path

**Benefits:**
- Pure functions, easy to test
- Reusable across components
- Reduces main file clutter

---

**Phase 1 Total Reduction:** ~700 lines
**Estimated Effort:** 2-3 days
**Risk Level:** Low ✅

---

## Phase 2: Debug & Rendering Systems (Week 2)

**Goal:** Extract complex but self-contained subsystems (~2,000 lines).

### 2.1 DebugPanelManager Class
**Extraction Target:** `src/lib/components/canvas/DebugPanelManager.ts`
**Lines Reduced:** ~400

**Responsibilities:**
- Debug console state management
- Debug timeline management
- Server-side debug data loading
- Node output inspection
- Debug navigation (prev/next)

**State to Extract:**
```typescript
class DebugPanelManager {
  showDebugConsole = $state(false);
  debugSelectedNode = $state<Node | null>(null);
  debugInputData = $state<any[]>([]);
  debugOutputData = $state<any[]>([]);
  debugEventLog = $state<DebugEvent[]>([]);
  debugTimelineOpen = $state(false);
  debugTimelineEvents = $state<TimelineEvent[]>([]);
  debugTimelineKind = $state<'node' | 'execution'>('node');
  isLoadingDebugData = $state(false);

  // Methods
  openDebugConsole(node: Node): void
  closeDebugConsole(): void
  openDebugTimeline(executionId: string): void
  closeDebugTimeline(): void
  loadServerDebugFor(nodeId: string): Promise<void>
  navigateDebugNext(): void
  navigateDebugPrev(): void
  switchDebugContext(nodeId: string): void
  updateNodeDebugData(nodeId: string, data: any): void
}
```

---

### 2.2 NodeRenderer Component
**Extraction Target:** `src/lib/components/canvas/NodeRenderer.svelte`
**Lines Reduced:** ~800

**Responsibilities:**
- Dynamic node type rendering
- Node display components (DataGrid, Chart, Console, etc.)
- Node port rendering
- Node badge rendering (output counts, progress, etc.)
- Node state visualization (running, error, disabled)

**Props:**
```typescript
interface NodeRendererProps {
  node: Node;
  isSelected: boolean;
  transform: string;
  onNodeClick: (node: Node) => void;
  onPortMouseDown: (node: Node, port: string) => void;
  onPortMouseUp: (node: Node, port: string) => void;
  onResizeStart: (node: Node) => void;
}
```

**Benefits:**
- Isolate complex rendering logic
- Easier to optimize individual node types
- Better code splitting opportunities

---

### 2.3 ConnectionRenderer Component
**Extraction Target:** `src/lib/components/canvas/ConnectionRenderer.svelte`
**Lines Reduced:** ~600

**Responsibilities:**
- Connection line rendering (SVG paths)
- Connection flow animations
- Connection hover states
- Connection action toolbar
- Flow totals display

**Props:**
```typescript
interface ConnectionRendererProps {
  connections: Connection[];
  nodes: Node[];
  hoveredConnectionId: string | null;
  disabledConnections: Set<string>;
  connectionFlowTotals: Map<string, number>;
  onConnectionClick: (conn: Connection) => void;
  onConnectionDelete: (conn: Connection) => void;
}
```

---

**Phase 2 Total Reduction:** ~1,800 lines
**Estimated Effort:** 4-5 days
**Risk Level:** Medium ⚠️

---

## Phase 3: Execution & State Management (Week 3)

**Goal:** Extract complex state management systems (~1,200 lines).

### 3.1 ExecutionManager Class
**Extraction Target:** `src/lib/components/canvas/ExecutionManager.ts`
**Lines Reduced:** ~500

**Responsibilities:**
- Execution state tracking
- Run panel management
- Execution list loading
- SSE stream management
- Execution grouping
- Progress calculation

**State to Extract:**
```typescript
class ExecutionManager {
  currentExecutionId = $state<string | null>(null);
  executionStatus = $state<ExecutionStatus>({});
  executionES = $state<EventSource | null>(null);
  runPanel = $state<RunPanel | null>(null);
  runExecs = $state<Execution[]>([]);
  execGroups = $state<ExecGroup[]>([]);
  isLoadingExecList = $state(false);

  // Methods
  startRunPanelFor(nodeId: string): void
  closeRunPanel(): void
  resetRunPanel(): void
  loadExecutionsForPipeline(pipelineId: string): Promise<void>
  attachExecutionStream(executionId: string): void
  checkPipelineCompletion(): void
  updateExecGroups(): void
  computeGlobalProgress(): number
  startExecAutoRefresh(): void
  stopExecAutoRefresh(): void
}
```

---

### 3.2 GroupManager Class
**Extraction Target:** `src/lib/components/canvas/GroupManager.ts`
**Lines Reduced:** ~400

**Responsibilities:**
- Node group management
- Group tab switching
- Group persistence
- Node-to-group assignment

---

### 3.3 PipelinePersistence Service
**Extraction Target:** `src/lib/services/PipelinePersistence.ts`
**Lines Reduced:** ~300

**Responsibilities:**
- Save/load pipeline operations
- Pipeline listing
- Default pipeline management
- Auto-save functionality

---

**Phase 3 Total Reduction:** ~1,200 lines
**Estimated Effort:** 4-5 days
**Risk Level:** High 🔴

---

## Phase 4: Credentials & Modals (Week 4)

**Goal:** Extract modal dialogs and credential management (~2,000 lines).

### 4.1 CredentialsManager Component
**Extraction Target:** `src/lib/components/canvas/credentials/`
**Lines Reduced:** ~500

Split into:
- `MongoCredentialsManager.svelte`
- `PostgresCredentialsManager.svelte`
- `LlmCredentialsManager.svelte`

---

### 4.2 Modal System Extraction
**Extraction Target:** `src/lib/components/canvas/modals/`
**Lines Reduced:** ~1,500

Extract individual modal components:
- `PipelineLoadModal.svelte`
- `PipelineSaveModal.svelte`
- `GroupManagementModal.svelte`
- `NodeSettingsModal.svelte` (already exists, but integrate better)
- `SelectionActionsModal.svelte`

---

**Phase 4 Total Reduction:** ~2,000 lines
**Estimated Effort:** 3-4 days
**Risk Level:** Low ✅

---

## Phase 5: Final Optimization (Week 5)

**Goal:** Optimize remaining code and reactive effects.

### 5.1 Reactive Effects Consolidation
- Review and consolidate `$effect()` blocks
- Extract side effects into manager methods
- Reduce unnecessary reactivity

### 5.2 Event Handler Optimization
- Consolidate similar event handlers
- Extract common patterns
- Add proper event delegation

### 5.3 Performance Tuning
- Add proper `$derived` for expensive calculations
- Implement viewport culling (render only visible nodes)
- Add virtual scrolling for execution lists

---

**Phase 5 Total Reduction:** ~500 lines
**Estimated Effort:** 2-3 days
**Risk Level:** Medium ⚠️

---

## Success Metrics

### Quantitative Goals
- **Line Count:** 10,916 → ~2,500 (77% reduction)
- **File Size:** ~400 KB → ~100 KB (75% reduction)
- **Component Count:** 1 → 15-20 components
- **Test Coverage:** 0% → 60%+ (new modules)

### Qualitative Goals
- ✅ Each module has single responsibility
- ✅ All modules are unit testable
- ✅ Clear interfaces between modules
- ✅ Improved code readability
- ✅ Easier onboarding for new developers
- ✅ Better code splitting & lazy loading

---

## Risk Mitigation

### Testing Strategy
1. **Create comprehensive E2E tests BEFORE refactoring**
2. **Extract one module at a time**
3. **Run full test suite after each extraction**
4. **Manual testing of critical paths**

### Rollback Plan
- Each phase is a separate PR
- Can revert individual phases without affecting others
- Feature flags for new architecture (if needed)

### Communication
- Daily progress updates
- Demo after each phase completion
- Document breaking changes (if any)

---

## Timeline Summary

| Phase | Duration | Lines Reduced | Risk | Start Date |
|-------|----------|---------------|------|------------|
| Phase 1 | 2-3 days | ~700 | Low ✅ | Week 1 |
| Phase 2 | 4-5 days | ~1,800 | Medium ⚠️ | Week 2 |
| Phase 3 | 4-5 days | ~1,200 | High 🔴 | Week 3 |
| Phase 4 | 3-4 days | ~2,000 | Low ✅ | Week 4 |
| Phase 5 | 2-3 days | ~500 | Medium ⚠️ | Week 5 |
| **Total** | **15-20 days** | **~6,200** | | **5 weeks** |

**Remaining Core Logic:** ~4,700 lines (necessary complexity)

---

## Next Steps

1. ✅ **Review and approve this roadmap**
2. Create E2E test suite for critical paths
3. Begin Phase 1: Extract ViewportManager
4. Begin Phase 1: Extract SelectionManager
5. Begin Phase 1: Extract utility functions

---

## Notes

- This is an aggressive but achievable plan
- Can adjust timeline based on priorities
- Some phases can be done in parallel
- Each phase delivers immediate value
- No breaking changes for end users

---

**Ready to proceed?** Let's start with Phase 1!





===============================================================


I found the root cause! The DataManagementCanvas.svelte file is 11,235 lines and 484KB in size. This massive file takes 10+ seconds just to parse and evaluate before Svelte can even mount the component.

  The main issues:

  1. Massive file size: 484KB is extremely large for a single component
  2. 40+ individual icon imports (lines 22-62): Each lucide-svelte icon import adds overhead
  3. Numerous component and service imports: Each needs to be loaded and evaluated
  4. Complex component logic: All 11,235 lines need to be parsed before mounting

  This is a classic JavaScript parse/evaluation bottleneck. The browser needs to:
  - Download the bundle (if not cached)
  - Parse 484KB of JavaScript ← 10+ seconds happening here
  - Resolve all imports
  - Evaluate the component code
  - Only then can Svelte mount and run onMount

  Solutions (in order of impact):

  1. Code splitting: Break DataManagementCanvas into smaller, focused components
  2. Lazy load non-critical sections: Use dynamic imports for modals, panels, and tabs
  3. Icon optimization: Create a shared icon component or registry instead of 40+ individual imports
  4. Move logic to services: Extract business logic from component scope

  Would you like me to:
  1. Create a refactoring plan to split this component?
  2. Start with quick wins (lazy loading icons/components)?
  3. Analyze which parts can be easily extracted?

  The good news is that once we reduce the initial parse burden, the component will mount almost instantly.
