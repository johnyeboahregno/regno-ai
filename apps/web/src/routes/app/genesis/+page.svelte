<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    CATALOG,
    CATEGORIES,
    getCatalogNode,
    NODE_WIDTH,
    PORT_SPACING,
    PORT_HEADER,
    type CategoryKey,
  } from '$lib/pipeline/catalog';
  import type { PipelineNode, PipelineEdge, RunLog } from '$lib/pipeline/types';

  // ── canvas state ────────────────────────────────────────────────
  let nodes: PipelineNode[] = [];
  let edges: PipelineEdge[] = [];
  let name = 'untitled-pipeline';
  let currentPipelineId: string | null = null;
  let dirty = false;

  let panX = 60;
  let panY = 60;
  let zoom = 1;

  let selectedNodeId: string | null = null;
  let selectedEdgeId: string | null = null;
  let collapsed: Record<string, boolean> = {};

  // interactions
  let dragging: { id: string; startX: number; startY: number; nodeX: number; nodeY: number } | null = null;
  let panning: { startX: number; startY: number; panX: number; panY: number } | null = null;
  let pending: { from: string; fromPort: string; x: number; y: number } | null = null;
  let mouseCanvas = { x: 0, y: 0 };
  let containerEl: HTMLDivElement;

  // modals
  let showJson = false;
  let showLoad = false;
  let showRuns = false;
  let savedPipelines: Array<{ id: string; name: string; nodes: number; createdAt?: string }> = [];
  let runs: Array<{ executionId: string; name: string; nodeCount: number; durationMs?: number; startedAt?: string }> = [];

  // execution
  let running = false;
  let es: EventSource | null = null;
  let logs: RunLog[] = [];
  let runOutputs: Record<string, unknown> = {};
  let statusText = '';
  let consoleTab: 'logs' | 'outputs' = 'logs';

  const portId = (kind: 'i' | 'o', index: number) => `${kind}${index}`;

  function getNode(id: string): PipelineNode | undefined {
    return nodes.find((n) => n.id === id);
  }

  function portIndex(kind: 'i' | 'o', port: string): number {
    const n = parseInt(port.slice(1), 10);
    return Number.isFinite(n) ? n : 0;
  }

  function portCanvas(node: PipelineNode, kind: 'i' | 'o', index: number) {
    return {
      x: node.x + (kind === 'o' ? NODE_WIDTH : 0),
      y: node.y + PORT_HEADER + index * PORT_SPACING + 12,
    };
  }

  function nodeHeight(node: PipelineNode): number {
    const def = getCatalogNode(node.type);
    return PORT_HEADER + Math.max(def.inputs.length, def.outputs.length, 1) * PORT_SPACING + 12;
  }

  function edgePath(e: PipelineEdge): string {
    const from = getNode(e.from);
    const to = getNode(e.to);
    if (!from || !to) return '';
    const a = portCanvas(from, 'o', portIndex('o', e.fromPort));
    const b = portCanvas(to, 'i', portIndex('i', e.toPort));
    const dx = Math.max(30, (b.x - a.x) / 2);
    return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
  }

  function toCanvas(clientX: number, clientY: number) {
    const r = containerEl?.getBoundingClientRect();
    const ox = r ? r.left : 0;
    const oy = r ? r.top : 0;
    return { x: (clientX - ox - panX) / zoom, y: (clientY - oy - panY) / zoom };
  }

  // ── node / edge ops ─────────────────────────────────────────────
  function addNode(type: string, at?: { x: number; y: number }) {
    const def = getCatalogNode(type);
    const pos = at ?? (() => {
      const r = containerEl?.getBoundingClientRect();
      const cw = r?.width ?? 900;
      const ch = r?.height ?? 600;
      const center = toCanvas(r ? r.left + cw / 2 : 0, r ? r.top + ch / 2 : 0);
      return {
        x: center.x - NODE_WIDTH / 2 + (Math.random() * 40 - 20),
        y: center.y - 30 + (Math.random() * 40 - 20),
      };
    })();
    const id = crypto.randomUUID();
    const config: Record<string, unknown> = {};
    for (const f of def.fields) config[f.key] = f.default ?? '';
    nodes = [
      ...nodes,
      { id, type, label: def.label, x: pos.x, y: pos.y, config, status: 'idle' },
    ];
    selectedNodeId = id;
    dirty = true;
  }

  function removeNode(id: string) {
    nodes = nodes.filter((n) => n.id !== id);
    edges = edges.filter((e) => e.from !== id && e.to !== id);
    if (selectedNodeId === id) selectedNodeId = null;
    dirty = true;
  }

  function removeEdge(id: string) {
    edges = edges.filter((e) => e.id !== id);
    if (selectedEdgeId === id) selectedEdgeId = null;
    dirty = true;
  }

  /** Reassign the selected node with a fresh object so Svelte re-renders it. */
  function touch(id: string) {
    nodes = nodes.map((n) => (n.id === id ? { ...n } : n));
    dirty = true;
  }

  function setConfig(id: string, key: string, value: unknown) {
    nodes = nodes.map((n) => (n.id === id ? { ...n, config: { ...n.config, [key]: value } } : n));
    dirty = true;
  }

  function setSwitch(id: string, key: string, checked: boolean) {
    setConfig(id, key, checked);
  }

  function beginConnect(nodeId: string, kind: 'i' | 'o', index: number) {
    const node = getNode(nodeId);
    if (!node) return;
    const p = portCanvas(node, kind, index);
    pending = { from: nodeId, fromPort: portId(kind, index), x: p.x, y: p.y };
  }

  function completeConnect(nodeId: string, kind: 'i' | 'o', index: number) {
    if (!pending) return;
    let from = pending.from;
    let fromPort = pending.fromPort;
    let to = nodeId;
    let toPort = portId(kind, index);
    // allow connecting from input → output (auto-swap to output → input)
    if (pending.fromPort.startsWith('i') && kind === 'o') {
      from = nodeId;
      fromPort = portId(kind, index);
      to = pending.from;
      toPort = pending.fromPort;
    }
    if (from === to) {
      pending = null;
      return;
    }
    // one edge per input port
    edges = [...edges.filter((e) => !(e.to === to && e.toPort === toPort)), { id: crypto.randomUUID(), from, fromPort, to, toPort }];
    pending = null;
    dirty = true;
  }

  // ── pointer interactions ────────────────────────────────────────
  function onCanvasPointerDown(e: PointerEvent) {
    const target = e.target as HTMLElement;
    if (target.closest('.node') || target.closest('.port') || target.closest('.edge')) return;
    // start pan
    panning = { startX: e.clientX, startY: e.clientY, panX, panY };
    selectedNodeId = null;
    selectedEdgeId = null;
    e.preventDefault();
  }

  function onNodePointerDown(e: PointerEvent, node: PipelineNode) {
    e.stopPropagation();
    if (e.button !== 0) return;
    dragging = { id: node.id, startX: e.clientX, startY: e.clientY, nodeX: node.x, nodeY: node.y };
    selectedNodeId = node.id;
    selectedEdgeId = null;
    e.preventDefault();
  }

  function onPortPointerDown(e: PointerEvent, nodeId: string, kind: 'i' | 'o', index: number) {
    e.stopPropagation();
    if (e.button !== 0) return;
    if (pending) {
      completeConnect(nodeId, kind, index);
    } else {
      beginConnect(nodeId, kind, index);
    }
  }

  function onEdgeClick(e: MouseEvent, edge: PipelineEdge) {
    e.stopPropagation();
    selectedEdgeId = edge.id;
    selectedNodeId = null;
  }

  function onWindowPointerMove(e: PointerEvent) {
    mouseCanvas = toCanvas(e.clientX, e.clientY);
    if (dragging) {
      const dx = (e.clientX - dragging.startX) / zoom;
      const dy = (e.clientY - dragging.startY) / zoom;
      nodes = nodes.map((n) =>
        n.id === dragging!.id ? { ...n, x: Math.round(dragging!.nodeX + dx), y: Math.round(dragging!.nodeY + dy) } : n,
      );
      dirty = true;
    } else if (panning) {
      panX = panning.panX + (e.clientX - panning.startX);
      panY = panning.panY + (e.clientY - panning.startY);
    }
    if (pending) {
      pending = { ...pending, x: mouseCanvas.x, y: mouseCanvas.y };
    }
  }

  function onWindowPointerUp() {
    dragging = null;
    panning = null;
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0012);
    zoom = Math.min(2.5, Math.max(0.3, zoom * factor));
  }

  function zoomAt(step: number) {
    zoom = Math.min(2.5, Math.max(0.3, zoom + step));
  }

  function fitView() {
    if (nodes.length === 0) return;
    const r = containerEl?.getBoundingClientRect();
    if (!r) return;
    const minX = Math.min(...nodes.map((n) => n.x));
    const minY = Math.min(...nodes.map((n) => n.y));
    const maxX = Math.max(...nodes.map((n) => n.x + NODE_WIDTH));
    const maxY = Math.max(...nodes.map((n) => n.y + nodeHeight(n)));
    const w = maxX - minX;
    const h = maxY - minY;
    zoom = Math.min(2, Math.min((r.width - 80) / w, (r.height - 80) / h));
    zoom = Math.max(0.3, Math.min(2.5, zoom));
    panX = r.width / 2 - (minX + w / 2) * zoom;
    panY = r.height / 2 - (minY + h / 2) * zoom;
  }

  function onKeyDown(e: KeyboardEvent) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && !(e.target as HTMLElement)?.closest('input, textarea, select')) {
      e.preventDefault();
      if (selectedEdgeId) removeEdge(selectedEdgeId);
      else if (selectedNodeId) removeNode(selectedNodeId);
    }
    if (e.key === 'Escape') {
      pending = null;
      selectedNodeId = null;
      selectedEdgeId = null;
      showJson = false;
      showLoad = false;
      showRuns = false;
    }
  }

  // ── pipeline lifecycle ──────────────────────────────────────────
  function resetAll() {
    nodes = [];
    edges = [];
    name = 'untitled-pipeline';
    currentPipelineId = null;
    selectedNodeId = null;
    selectedEdgeId = null;
    pending = null;
    logs = [];
    runOutputs = {};
    statusText = '';
    running = false;
    es?.close();
    es = null;
    dirty = false;
    panX = 60;
    panY = 60;
    zoom = 1;
  }

  function loadDemo() {
    resetAll();
    name = 'Demo — Knowledge Digest';
    const sample = JSON.stringify([
      { title: 'Welcome to GENESIS', content: 'Pipelines turn Regno.ai capabilities into repeatable, governed flows.' },
      { title: 'Composability', content: 'Any platform capability can be composed into a pipeline.' },
      { title: 'Determinism', content: 'The tenth run behaves exactly like the first.' },
    ]);
    const ds = { id: crypto.randomUUID(), type: 'datasource', label: 'Data Source', x: 40, y: 40, config: { sample }, status: 'idle' as const };
    const tr = { id: crypto.randomUUID(), type: 'transform', label: 'Transform', x: 330, y: 40, config: { expression: 'item => ({ ...item, length: item.content?.length ?? 0 })' }, status: 'idle' as const };
    const llm = { id: crypto.randomUUID(), type: 'llm', label: 'LLM', x: 620, y: 40, config: { prompt: 'Summarize these knowledge items in 3 bullets:\n\n{input}' }, status: 'idle' as const };
    const disp = { id: crypto.randomUUID(), type: 'display', label: 'Display', x: 910, y: 40, config: {}, status: 'idle' as const };
    nodes = [ds, tr, llm, disp];
    edges = [
      { id: crypto.randomUUID(), from: ds.id, fromPort: 'o0', to: tr.id, toPort: 'i0' },
      { id: crypto.randomUUID(), from: tr.id, fromPort: 'o0', to: llm.id, toPort: 'i0' },
      { id: crypto.randomUUID(), from: llm.id, fromPort: 'o0', to: disp.id, toPort: 'i0' },
    ];
    dirty = true;
  }

  function pushLog(level: RunLog['level'], message: string, nodeId?: string) {
    logs = [...logs, { level, message, nodeId, ts: new Date().toLocaleTimeString() }];
  }

  async function save() {
    if (nodes.length === 0) {
      pushLog('warn', 'Add at least one node before saving');
      return;
    }
    const body = { name, nodes, edges };
    try {
      if (currentPipelineId) {
        const r = await fetch(`/api/pipelines/${currentPipelineId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const d = await r.json().catch(() => ({}));
        if (!d.ok) {
          pushLog('error', d.error ?? 'Failed to save');
          return;
        }
      } else {
        const r = await fetch('/api/pipelines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const d = await r.json().catch(() => ({}));
        if (!d.ok) {
          pushLog('error', d.error ?? 'Failed to save');
          return;
        }
        currentPipelineId = d.id;
      }
      dirty = false;
      pushLog('ok', `Saved "${name}" (${nodes.length} nodes)`);
    } catch (e) {
      pushLog('error', `Save failed: ${(e as Error).message}`);
    }
  }

  async function loadList() {
    const r = await fetch('/api/pipelines');
    const d = await r.json();
    if (d.ok) {
      savedPipelines = d.pipelines.map((p: { id: string; name: string; nodes: unknown[]; createdAt?: string }) => ({
        id: p.id,
        name: p.name,
        nodes: (p.nodes as unknown[]).length,
        createdAt: p.createdAt,
      }));
      showLoad = true;
    }
  }

  async function loadPipeline(id: string) {
    const r = await fetch(`/api/pipelines/${id}`);
    const d = await r.json();
    if (d.ok && d.pipeline) {
      nodes = (d.pipeline.nodes ?? []).map((n: PipelineNode) => ({ ...n, status: 'idle', error: undefined }));
      edges = d.pipeline.edges ?? [];
      name = d.pipeline.name;
      currentPipelineId = d.pipeline.id;
      dirty = false;
      showLoad = false;
      fitView();
      pushLog('ok', `Loaded "${name}"`);
    } else {
      pushLog('error', d.error ?? 'Failed to load');
    }
  }

  async function deletePipeline(id: string) {
    await fetch(`/api/pipelines/${id}`, { method: 'DELETE' });
    await loadList();
  }

  async function run() {
    if (nodes.length === 0) {
      pushLog('warn', 'Add at least one node before running');
      return;
    }
    running = true;
    statusText = 'Running…';
    logs = [];
    runOutputs = {};
    consoleTab = 'logs';
    nodes = nodes.map((n) => ({ ...n, status: 'idle' as const, error: undefined, outputPreview: undefined }));
    try {
      const r = await fetch('/api/pipelines/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, nodes, edges, pipelineId: currentPipelineId ?? undefined }),
      });
      const d = await r.json();
      if (!d.ok) {
        pushLog('error', d.error ?? 'Failed to start run');
        running = false;
        statusText = 'Failed to start';
        return;
      }
      es = new EventSource(`/api/pipelines/run/${d.executionId}/events`);
      es.addEventListener('log', (ev) => {
        const p = JSON.parse((ev as MessageEvent).data);
        pushLog(p.level ?? 'info', p.message, p.nodeId);
      });
      es.addEventListener('node_started', (ev) => {
        const p = JSON.parse((ev as MessageEvent).data);
        setNodeStatus(p.nodeId, 'running');
      });
      es.addEventListener('node_completed', (ev) => {
        const p = JSON.parse((ev as MessageEvent).data);
        setNodeStatus(p.nodeId, 'ok', p.output);
      });
      es.addEventListener('node_error', (ev) => {
        const p = JSON.parse((ev as MessageEvent).data);
        setNodeStatus(p.nodeId, 'error', undefined, p.error);
      });
      es.addEventListener('execution_completed', (ev) => {
        const p = JSON.parse((ev as MessageEvent).data);
        runOutputs = p.outputs ?? {};
        running = false;
        statusText = `Completed in ${p.durationMs}ms`;
        es?.close();
      });
      es.addEventListener('execution_failed', (ev) => {
        const p = JSON.parse((ev as MessageEvent).data);
        running = false;
        statusText = `Failed: ${p.error ?? 'unknown error'}`;
        es?.close();
      });
      es.addEventListener('execution_done', () => {
        es?.close();
      });
      es.onerror = () => {
        running = false;
        es?.close();
      };
    } catch (e) {
      pushLog('error', `Run failed to start: ${(e as Error).message}`);
      running = false;
      statusText = 'Failed to start';
    }
  }

  function setNodeStatus(id: string, status: PipelineNode['status'], output?: unknown, error?: string) {
    nodes = nodes.map((n) =>
      n.id === id
        ? {
            ...n,
            status,
            error,
            outputPreview: output === undefined ? n.outputPreview : previewString(output),
          }
        : n,
    );
  }

  function previewString(v: unknown): string {
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    return s ? (s.length > 60 ? s.slice(0, 60) + '…' : s) : '';
  }

  async function loadRuns() {
    const r = await fetch('/api/pipelines/runs');
    const d = await r.json();
    if (d.ok) {
      runs = d.runs;
      showRuns = true;
    }
  }

  // ── lifecycle ───────────────────────────────────────────────────
  onMount(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('keydown', onKeyDown);
  });

  onDestroy(() => {
    if (typeof window === 'undefined') return;
    window.removeEventListener('pointermove', onWindowPointerMove);
    window.removeEventListener('pointerup', onWindowPointerUp);
    window.removeEventListener('keydown', onKeyDown);
    es?.close();
  });

  // ── config helpers ──────────────────────────────────────────────
  const selectedNode = (): PipelineNode | undefined => (selectedNodeId ? getNode(selectedNodeId) : undefined);
  const catColor = (c: CategoryKey) => CATEGORIES.find((x) => x.key === c)?.color ?? '#6c5ce7';
  $: sel = selectedNodeId ? getNode(selectedNodeId) : undefined;
</script>

<svelte:head><title>GENESIS — Real-time data pipeline system</title></svelte:head>

<div class="genesis">
  <!-- header -->
  <header class="head">
    <div class="title">
      <div class="brandline">
        <span class="mark"></span>
        <span class="brand-name">Regno AI</span>
        <span class="divider">/</span>
        <span class="app-name">GENESIS</span>
      </div>
      <p class="subtitle">Real-time data pipeline system</p>
    </div>
    <div class="toolbar">
      <button class="tb" on:click={() => { if (nodes.length && !confirm('Start a new pipeline? Unsaved work will be lost.')) return; resetAll(); }} title="New pipeline">
        <span class="ic">＋</span> New
      </button>
      <button class="tb" on:click={save} title="Save pipeline">
        <span class="ic">💾</span> Save
      </button>
      <button class="tb" on:click={loadList} title="Load saved pipeline">
        <span class="ic">📂</span> Load
      </button>
      <button class="tb" on:click={() => { resetAll(); }} title="Reset canvas">
        <span class="ic">↺</span> Reset
      </button>
      <button class="tb" on:click={() => { nodes = []; edges = []; selectedNodeId = null; }} title="Clear canvas">
        <span class="ic">🧹</span> Clear
      </button>
      <button class="tb" on:click={loadDemo} title="Load the demo pipeline">
        <span class="ic">🧪</span> Demo
      </button>
      <span class="grow"></span>
      <button class="tb" on:click={loadRuns} title="Recent runs">
        <span class="ic">🕘</span> Runs
      </button>
      <button class="tb" on:click={() => (showJson = true)} title="View pipeline JSON">
        <span class="ic">{'{ }'}</span> JSON
      </button>
    </div>
  </header>

  <!-- builder -->
  <div class="builder">
    <!-- palette -->
    <aside class="palette">
      <div class="palette-tabs">
        <button class="ptab active">Nodes</button>
        <button class="ptab" on:click={loadRuns}>Runs</button>
      </div>
      <div class="palette-scroll">
        {#each CATEGORIES as cat}
          <div class="cat">
            <button class="cat-head" on:click={() => (collapsed[cat.key] = !collapsed[cat.key])}>
              <span class="cat-dot" style={`background:${cat.color}`}></span>
              <span class="cat-label">{cat.label}</span>
              <span class="cat-hint">{cat.hint}</span>
            </button>
            {#if !collapsed[cat.key]}
              <div class="cat-body">
                {#each CATALOG.filter((n) => n.category === cat.key) as node}
                  <button class="palette-item" on:click={() => addNode(node.type)} title={node.description}>
                    <span class="pi-icon" style={`background:${cat.color}18; color:${cat.color}`}>{node.icon}</span>
                    <span class="pi-label">{node.label}</span>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </aside>

    <!-- canvas -->
    <div class="canvas-wrap">
      <div
        class="canvas"
        bind:this={containerEl}
        on:pointerdown={onCanvasPointerDown}
        on:wheel={onWheel}
        on:dblclick={(e) => {
          const p = toCanvas(e.clientX, e.clientY);
          addNode('datasource', p);
        }}
      >
        <div class="viewport" style={`transform: translate(${panX}px, ${panY}px) scale(${zoom});`}>
          <svg class="edges" style="position:absolute; left:0; top:0; width:1px; height:1px; overflow:visible;">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#8d7bff" />
              </marker>
            </defs>
            {#each edges as e (e.id)}
              <g class="edge" class:edge-selected={selectedEdgeId === e.id} on:pointerdown={(ev) => ev.stopPropagation()} on:click={(ev) => onEdgeClick(ev, e)}>
                <path class="edge-hit" d={edgePath(e)} />
                <path class="edge-line" d={edgePath(e)} marker-end="url(#arrow)" />
              </g>
            {/each}
            {#if pending}
              {@const from = getNode(pending.from)}
              {#if from}
                {@const a = portCanvas(from, pending.fromPort.startsWith('o') ? 'o' : 'i', portIndex(pending.fromPort.startsWith('o') ? 'o' : 'i', pending.fromPort))}
                <path
                  class="edge-pending"
                  d={`M ${a.x} ${a.y} C ${a.x + 40} ${a.y}, ${pending.x - 40} ${pending.y}, ${pending.x} ${pending.y}`}
                />
              {/if}
            {/if}
          </svg>

          {#each nodes as node (node.id)}
            {@const def = getCatalogNode(node.type)}
            {@const color = catColor(def.category)}
            <div
              class="node"
              class:selected={selectedNodeId === node.id}
              class:running={node.status === 'running'}
              class:error={node.status === 'error'}
              style={`left:${node.x}px; top:${node.y}px; width:${NODE_WIDTH}px; height:${nodeHeight(node)}px;`}
              on:pointerdown={(e) => onNodePointerDown(e, node)}
            >
              <div class="node-head" style={`border-left:3px solid ${color};`}>
                <span class="node-icon" style={`color:${color};`}>{def.icon}</span>
                <span class="node-label">{node.label}</span>
                {#if node.status === 'running'}<span class="status running" title="Running"></span>
                {:else if node.status === 'ok'}<span class="status ok" title="Completed"></span>
                {:else if node.status === 'error'}<span class="status err" title={node.error}>!</span>{/if}
                {#if selectedNodeId === node.id}
                  <button class="node-del" on:pointerdown={(e) => e.stopPropagation()} on:click={() => removeNode(node.id)} title="Delete node">✕</button>
                {/if}
              </div>

              <!-- input ports -->
              {#each def.inputs as label, i}
                <div
                  class="port input"
                  style={`top:${PORT_HEADER + i * PORT_SPACING + 4}px;`}
                  title={`Input: ${label}`}
                  on:pointerdown={(e) => onPortPointerDown(e, node.id, 'i', i)}
                >
                  <span class="port-dot"></span><span class="port-label">{label}</span>
                </div>
              {/each}

              <!-- output ports -->
              {#each def.outputs as label, i}
                <div
                  class="port output"
                  style={`top:${PORT_HEADER + i * PORT_SPACING + 4}px;`}
                  title={`Output: ${label}`}
                  on:pointerdown={(e) => onPortPointerDown(e, node.id, 'o', i)}
                >
                  <span class="port-label">{label}</span><span class="port-dot"></span>
                </div>
              {/each}

              {#if node.status === 'error' && node.error}
                <div class="node-error">{node.error}</div>
              {/if}
              {#if node.outputPreview}
                <div class="node-preview">{node.outputPreview}</div>
              {/if}
            </div>
          {/each}

          {#if nodes.length === 0}
            <div class="empty-hint" style="left:120px; top:120px;">
              <div class="eh-title">Drag nodes from the palette — or double-click the canvas</div>
              <div class="eh-sub">Compose Data Sources → Transformations → AI → Sinks, then Run.</div>
              <button class="eh-btn" on:click={loadDemo}>🚀 Load the demo pipeline</button>
            </div>
          {/if}
        </div>

        <!-- viewport controls -->
        <div class="view-controls">
          <button class="vc" on:click={() => zoomAt(-0.15)}>−</button>
          <span class="vc-zoom">{Math.round(zoom * 100)}%</span>
          <button class="vc" on:click={() => zoomAt(0.15)}>＋</button>
          <button class="vc" on:click={fitView} title="Fit to view">⛶</button>
          <button class="vc" on:click={() => { panX = 0; panY = 0; zoom = 1; }} title="Reset view">↺</button>
        </div>
        {#if pending}
          <div class="pending-hint">Connect to an input port — Esc to cancel</div>
        {/if}
      </div>
    </div>

    <!-- config panel -->
    <aside class="config">
      {#if sel}
        {@const def = getCatalogNode(sel.type)}
        <div class="cfg-head">
          <span class="cfg-icon" style={`color:${catColor(def.category)};`}>{def.icon}</span>
          <div>
            <div class="cfg-type">{def.label} <span class="cfg-type-mono">{sel.type}</span></div>
            <div class="cfg-desc">{def.description}</div>
          </div>
        </div>
        <div class="cfg-body">
          <label>Label</label>
          <input class="cfg-input" bind:value={sel.label} on:input={() => touch(sel.id)} />
          <label>ID</label>
          <input class="cfg-input" readonly value={sel.id} />
          <label>Type</label>
          <div class="cfg-tag">{sel.type}</div>
          <label>Category</label>
          <div class="cfg-tag" style={`color:${catColor(def.category)};`}>{def.category}</div>

          <div class="cfg-fields">
            {#each def.fields as f}
              <label>{f.label}</label>
              {#if f.kind === 'textarea' || f.kind === 'code'}
                <textarea class="cfg-input mono" rows={f.kind === 'code' ? 4 : 3} placeholder={f.placeholder} bind:value={sel.config[f.key]} on:input={() => touch(sel.id)}></textarea>
              {:else if f.kind === 'select'}
                <select class="cfg-input" bind:value={sel.config[f.key]} on:change={() => touch(sel.id)}>
                  {#each f.options ?? [] as o}
                    <option value={o.value}>{o.label}</option>
                  {/each}
                </select>
              {:else if f.kind === 'switch'}
                <label class="switch-row">
                  <input type="checkbox" checked={!!sel.config[f.key]} on:change={(e) => setSwitch(sel.id, f.key, e.currentTarget.checked)} />
                  <span>Enabled</span>
                </label>
              {:else if f.kind === 'number'}
                <input class="cfg-input" type="number" bind:value={sel.config[f.key]} on:input={() => touch(sel.id)} />
              {:else}
                <input class="cfg-input" placeholder={f.placeholder} bind:value={sel.config[f.key]} on:input={() => touch(sel.id)} />
              {/if}
              {#if f.help}<div class="cfg-help">{f.help}</div>{/if}
            {/each}
          </div>

          <div class="cfg-actions">
            <button class="btn solid" on:click={() => removeNode(sel.id)} style="width:100%;">Delete node</button>
          </div>
        </div>
      {:else}
        <div class="cfg-empty">
          <div class="ce-icon">🔧</div>
          <div class="ce-title">Node settings</div>
          <div class="ce-text">Select a node on the canvas to configure it — prompt, expression, routing, provider, and more.</div>
        </div>
      {/if}
    </aside>
  </div>

  <!-- execution console -->
  <footer class="console">
    <div class="console-head">
      <div class="console-title">
        <span class="dot"></span>
        <span class="mono">Execution Console</span>
      </div>
      <div class="console-tabs">
        <button class:active={consoleTab === 'logs'} on:click={() => (consoleTab = 'logs')}>Logs</button>
        <button class:active={consoleTab === 'outputs'} on:click={() => (consoleTab = 'outputs')}>Outputs</button>
      </div>
      <div class="grow"></div>
      <button class="run-btn" class:running on:click={run} disabled={running || nodes.length === 0}>
        {running ? '● Running…' : '▶ Run pipeline'}
      </button>
      <span class="status-text" class:ok={statusText.startsWith('Completed')} class:bad={statusText.startsWith('Failed')}>{statusText}</span>
    </div>
    <div class="console-body">
      {#if consoleTab === 'logs'}
        {#if logs.length === 0}
          <div class="console-empty">
            <span class="mono faint">No execution yet — press <b>Run pipeline</b> to execute the graph in topological order.</span>
          </div>
        {:else}
          {#each logs as l, i}
            <div class="log-line" class:err={l.level === 'error'} class:ok={l.level === 'ok'} class:warn={l.level === 'warn'}>
              <span class="log-ts mono">{l.ts}</span>
              <span class="log-msg mono">{l.message}</span>
            </div>
          {/each}
        {/if}
      {:else}
        {#if Object.keys(runOutputs).length === 0}
          <div class="console-empty">
            <span class="mono faint">No outputs yet — run a pipeline with Display / Data Sink / Cortex Index nodes.</span>
          </div>
        {:else}
          {#each Object.entries(runOutputs) as [nodeId, value]}
            {@const node = getNode(nodeId)}
            {#if node}
              <details class="output-block" open>
                <summary class="mono">
                  <span class="ob-icon">{getCatalogNode(node.type).icon}</span> {node.label} <span class="faint">({node.type})</span>
                </summary>
                <pre class="output-pre">{JSON.stringify(value, null, 2)}</pre>
              </details>
            {/if}
          {/each}
        {/if}
      {/if}
    </div>
  </footer>
</div>

<!-- View JSON modal -->
{#if showJson}
  <div class="modal-backdrop" on:click={() => (showJson = false)}>
    <div class="modal" on:click|stopPropagation>
      <div class="modal-head">
        <span class="mono">Pipeline JSON — {name}</span>
        <button class="tb" on:click={() => (showJson = false)}>✕</button>
      </div>
      <pre class="json-pre">{JSON.stringify({ name, nodes, edges }, null, 2)}</pre>
      <div class="modal-foot">
        <button class="btn" on:click={() => navigator.clipboard?.writeText(JSON.stringify({ name, nodes, edges }, null, 2))}>Copy</button>
        <button class="btn solid" on:click={() => (showJson = false)}>Close</button>
      </div>
    </div>
  </div>
{/if}

<!-- Load modal -->
{#if showLoad}
  <div class="modal-backdrop" on:click={() => (showLoad = false)}>
    <div class="modal" on:click|stopPropagation>
      <div class="modal-head">
        <span class="mono">Saved pipelines</span>
        <button class="tb" on:click={() => (showLoad = false)}>✕</button>
      </div>
      <div class="load-list">
        {#if savedPipelines.length === 0}
          <div class="faint">No saved pipelines yet — build one and press Save.</div>
        {:else}
          {#each savedPipelines as p}
            <div class="load-item">
              <div class="li-main">
                <div class="li-name mono">{p.name}</div>
                <div class="li-sub">{p.nodes} nodes · {p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}</div>
              </div>
              <button class="tb" on:click={() => loadPipeline(p.id)}>Load</button>
              <button class="tb danger" on:click={() => deletePipeline(p.id)}>✕</button>
            </div>
          {/each}
        {/if}
      </div>
      <div class="modal-foot">
        <button class="btn solid" on:click={() => (showLoad = false)}>Close</button>
      </div>
    </div>
  </div>
{/if}

<!-- Runs modal -->
{#if showRuns}
  <div class="modal-backdrop" on:click={() => (showRuns = false)}>
    <div class="modal" on:click|stopPropagation>
      <div class="modal-head">
        <span class="mono">Recent runs</span>
        <button class="tb" on:click={() => (showRuns = false)}>✕</button>
      </div>
      <div class="load-list">
        {#if runs.length === 0}
          <div class="faint">No runs yet — press Run pipeline.</div>
        {:else}
          {#each runs as r}
            <div class="load-item">
              <div class="li-main">
                <div class="li-name mono">{r.name}</div>
                <div class="li-sub">{r.nodeCount} nodes · {r.durationMs ?? 0}ms{r.startedAt ? ` · ${new Date(r.startedAt).toLocaleString()}` : ''}</div>
              </div>
              <span class="tag" style="color:var(--good); border-color:var(--good);">{r.executionId.slice(0, 6)}</span>
            </div>
          {/each}
        {/if}
      </div>
      <div class="modal-foot">
        <button class="btn solid" on:click={() => (showRuns = false)}>Close</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .genesis {
    height: calc(100vh - 80px);
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
  }

  /* header */
  .head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .brandline { display: flex; align-items: center; gap: 10px; font-family: var(--display); }
  .mark { width: 10px; height: 10px; border-radius: 3px; background: linear-gradient(135deg, #6366f1, #a855f7); }
  .brand-name { font-weight: 800; font-size: 16px; letter-spacing: -0.01em; }
  .divider { color: var(--ink-faint); }
  .app-name { font-weight: 800; font-size: 16px; background: linear-gradient(135deg, #6366f1, #a855f7); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
  .subtitle { color: var(--ink-dim); font-size: 13px; margin-top: 3px; }

  .toolbar { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .tb {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--panel); border: 1px solid var(--line); color: var(--ink-dim);
    border-radius: 8px; padding: 7px 12px; font-size: 12.5px; font-weight: 500; cursor: pointer;
    transition: all 0.15s ease; font-family: var(--display);
  }
  .tb:hover { color: var(--ink); border-color: var(--signal-2); background: var(--panel-2); }
  .tb .ic { font-size: 13px; }
  .tb.danger:hover { color: var(--danger); border-color: var(--danger); }
  .grow { flex: 1; }

  /* builder row */
  .builder { display: grid; grid-template-columns: 232px 1fr 268px; gap: 12px; flex: 1; min-height: 0; }

  /* palette */
  .palette {
    background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
    display: flex; flex-direction: column; min-height: 0; overflow: hidden;
  }
  .palette-tabs { display: flex; gap: 4px; padding: 10px 10px 6px; border-bottom: 1px solid var(--line-soft); }
  .ptab {
    flex: 1; background: transparent; border: none; color: var(--ink-faint); font-family: var(--mono);
    font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; padding: 6px; border-radius: 6px; cursor: pointer;
  }
  .ptab.active { background: var(--bg-alt); color: var(--ink); }
  .palette-scroll { overflow-y: auto; padding: 8px; flex: 1; }
  .cat { margin-bottom: 6px; }
  .cat-head {
    width: 100%; display: flex; align-items: center; gap: 8px; padding: 8px 6px;
    background: transparent; border: none; border-radius: 8px; cursor: pointer; text-align: left;
  }
  .cat-head:hover { background: var(--bg-alt); }
  .cat-dot { width: 8px; height: 8px; border-radius: 2px; flex: none; }
  .cat-label { font-family: var(--display); font-size: 12.5px; font-weight: 600; color: var(--ink); }
  .cat-hint { margin-left: auto; font-size: 10px; color: var(--ink-faint); font-family: var(--mono); }
  .cat-body { display: flex; flex-direction: column; gap: 3px; padding-left: 4px; }
  .palette-item {
    display: flex; align-items: center; gap: 9px; padding: 6px 8px; width: 100%;
    background: transparent; border: 1px solid transparent; border-radius: 8px; cursor: pointer; text-align: left;
    transition: all 0.12s ease;
  }
  .palette-item:hover { background: var(--bg-alt); border-color: var(--line); }
  .pi-icon {
    width: 26px; height: 26px; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center;
    font-size: 13px; flex: none;
  }
  .pi-label { font-size: 12.5px; color: var(--ink-dim); font-family: var(--display); }
  .palette-item:hover .pi-label { color: var(--ink); }

  /* canvas */
  .canvas-wrap { position: relative; min-width: 0; border-radius: 12px; overflow: hidden; border: 1px solid var(--line); background: var(--bg-deep); }
  .canvas { position: absolute; inset: 0; overflow: hidden; cursor: grab; }
  .canvas:active { cursor: grabbing; }
  .viewport { position: absolute; top: 0; left: 0; transform-origin: 0 0; }

  .edge-hit { fill: none; stroke: transparent; stroke-width: 16; cursor: pointer; pointer-events: stroke; }
  .edge-line { fill: none; stroke: #6c5ce7; stroke-width: 2; opacity: 0.7; pointer-events: none; }
  .edge-selected .edge-line { stroke: #8d7bff; stroke-width: 3; opacity: 1; }
  .edge-pending { fill: none; stroke: #a855f7; stroke-width: 2; stroke-dasharray: 6 4; opacity: 0.9; pointer-events: none; }

  .node {
    position: absolute; background: var(--panel); border: 1px solid var(--line); border-radius: 10px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.35); cursor: grab; user-select: none;
    transition: box-shadow 0.12s ease, border-color 0.12s ease;
  }
  .node:hover { border-color: var(--ink-faint); }
  .node.selected { border-color: var(--signal-2); box-shadow: 0 0 0 1px var(--signal-2), 0 8px 24px rgba(108,92,231,0.25); }
  .node.running { border-color: #f59e0b; }
  .node.running .node-head { animation: pulse 1.2s ease-in-out infinite; }
  .node.error { border-color: var(--danger); }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }

  .node-head {
    display: flex; align-items: center; gap: 8px; padding: 8px 10px; height: 34px;
    border-bottom: 1px solid var(--line-soft); border-radius: 9px 9px 0 0;
  }
  .node-icon { font-size: 14px; }
  .node-label { font-family: var(--display); font-size: 12.5px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .node-del { margin-left: auto; background: transparent; border: none; color: var(--ink-faint); cursor: pointer; font-size: 11px; padding: 2px 4px; }
  .node-del:hover { color: var(--danger); }
  .status { width: 8px; height: 8px; border-radius: 50%; flex: none; margin-left: auto; }
  .status.running { background: #f59e0b; }
  .status.ok { background: var(--good); }
  .status.err { width: 14px; height: 14px; background: var(--danger); color: #fff; font-size: 9px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; }

  .port { position: absolute; display: flex; align-items: center; gap: 6px; height: 16px; cursor: crosshair; z-index: 3; }
  .port.input { left: -1px; }
  .port.output { right: -1px; }
  .port-label { font-family: var(--mono); font-size: 9.5px; color: var(--ink-faint); text-transform: uppercase; letter-spacing: 0.05em; }
  .port-dot { width: 11px; height: 11px; border-radius: 50%; background: var(--bg-alt); border: 2px solid var(--signal-2); transition: all 0.12s ease; }
  .port:hover .port-dot { background: var(--signal-2); transform: scale(1.25); }
  .port.input .port-dot { margin-right: -1px; }

  .node-error {
    position: absolute; left: 6px; right: 6px; bottom: 4px; background: rgba(244,63,94,0.12); border: 1px solid var(--danger);
    color: #fda4af; font-family: var(--mono); font-size: 9.5px; padding: 4px 6px; border-radius: 6px; z-index: 4;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .node-preview {
    position: absolute; left: 6px; right: 6px; bottom: 4px; background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.3);
    color: #6ee7b7; font-family: var(--mono); font-size: 9.5px; padding: 4px 6px; border-radius: 6px; z-index: 4;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .empty-hint { position: absolute; width: 380px; padding: 26px; text-align: center; border: 1px dashed var(--line); border-radius: 14px; background: rgba(18,21,42,0.6); }
  .eh-title { font-family: var(--display); font-weight: 600; color: var(--ink); font-size: 15px; }
  .eh-sub { color: var(--ink-dim); font-size: 12.5px; margin-top: 6px; line-height: 1.5; }
  .eh-btn { margin-top: 16px; background: linear-gradient(135deg, var(--signal), var(--signal-2)); border: none; color: #fff; padding: 9px 16px; border-radius: 8px; font-family: var(--display); font-size: 13px; cursor: pointer; }
  .eh-btn:hover { filter: brightness(1.1); }

  .view-controls { position: absolute; top: 10px; right: 10px; display: flex; align-items: center; gap: 4px; background: rgba(10,12,22,0.85); border: 1px solid var(--line); border-radius: 9px; padding: 4px; backdrop-filter: blur(8px); }
  .vc { background: transparent; border: none; color: var(--ink-dim); width: 26px; height: 26px; border-radius: 6px; cursor: pointer; font-size: 14px; }
  .vc:hover { background: var(--panel-2); color: var(--ink); }
  .vc-zoom { font-family: var(--mono); font-size: 11px; color: var(--ink-dim); min-width: 40px; text-align: center; }
  .pending-hint { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); background: rgba(108,92,231,0.15); border: 1px solid var(--signal-2); color: var(--ink); font-family: var(--mono); font-size: 11px; padding: 6px 12px; border-radius: 999px; }

  /* config panel */
  .config { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; overflow-y: auto; min-height: 0; }
  .cfg-head { display: flex; gap: 12px; align-items: flex-start; padding: 16px 14px; border-bottom: 1px solid var(--line-soft); }
  .cfg-icon { font-size: 22px; }
  .cfg-type { font-family: var(--display); font-weight: 700; font-size: 15px; color: var(--ink); }
  .cfg-type-mono { font-family: var(--mono); font-size: 10px; color: var(--ink-faint); font-weight: 400; }
  .cfg-desc { font-size: 12px; color: var(--ink-dim); margin-top: 4px; line-height: 1.45; }
  .cfg-body { padding: 14px; }
  .cfg-body label { display: block; font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-faint); margin: 12px 0 6px; }
  .cfg-body label:first-child { margin-top: 0; }
  .cfg-input { width: 100%; background: var(--bg-alt); border: 1px solid var(--line); color: var(--ink); border-radius: 8px; padding: 8px 10px; font-size: 12.5px; }
  .cfg-input.mono, .mono { font-family: var(--mono); }
  .cfg-input:focus { outline: none; border-color: var(--signal); }
  .cfg-tag { font-family: var(--mono); font-size: 11px; color: var(--ink-dim); background: var(--bg-alt); border: 1px solid var(--line); padding: 6px 10px; border-radius: 6px; display: inline-block; }
  .cfg-help { font-size: 11px; color: var(--ink-faint); margin-top: 4px; line-height: 1.4; }
  .switch-row { display: flex; align-items: center; gap: 8px; cursor: pointer; text-transform: none !important; letter-spacing: 0 !important; font-family: var(--display) !important; font-size: 12.5px !important; color: var(--ink-dim) !important; margin-top: 0 !important; }
  .cfg-actions { margin-top: 18px; }
  .cfg-empty { padding: 24px; text-align: center; color: var(--ink-faint); }
  .ce-icon { font-size: 26px; }
  .ce-title { font-family: var(--display); font-weight: 600; color: var(--ink); margin-top: 10px; }
  .ce-text { font-size: 12px; margin-top: 8px; line-height: 1.5; }

  /* console */
  .console { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; display: flex; flex-direction: column; height: 210px; min-height: 0; }
  .console-head { display: flex; align-items: center; gap: 14px; padding: 10px 14px; border-bottom: 1px solid var(--line-soft); }
  .console-title { display: flex; align-items: center; gap: 8px; font-family: var(--display); font-size: 12.5px; font-weight: 600; color: var(--ink); }
  .console-title .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--good); }
  .console-tabs { display: flex; gap: 4px; }
  .console-tabs button { background: transparent; border: none; color: var(--ink-faint); font-family: var(--mono); font-size: 11px; padding: 5px 10px; border-radius: 6px; cursor: pointer; }
  .console-tabs button.active { background: var(--bg-alt); color: var(--ink); }
  .run-btn {
    background: linear-gradient(135deg, var(--signal), var(--signal-2)); border: none; color: #fff;
    font-family: var(--display); font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 8px; cursor: pointer;
  }
  .run-btn:hover { filter: brightness(1.1); }
  .run-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .run-btn.running { background: #f59e0b; }
  .status-text { font-family: var(--mono); font-size: 11px; color: var(--ink-faint); }
  .status-text.ok { color: var(--good); }
  .status-text.bad { color: var(--danger); }
  .console-body { flex: 1; overflow-y: auto; padding: 10px 14px; }
  .console-empty { padding: 20px; text-align: center; }
  .log-line { display: flex; gap: 12px; padding: 3px 0; font-size: 12px; }
  .log-ts { color: var(--ink-faint); flex: none; }
  .log-msg { color: var(--ink-dim); white-space: pre-wrap; word-break: break-word; }
  .log-line.ok .log-msg { color: var(--good); }
  .log-line.err .log-msg { color: var(--danger); }
  .log-line.warn .log-msg { color: #fbbf24; }
  .output-block { border: 1px solid var(--line); border-radius: 8px; margin-bottom: 8px; overflow: hidden; }
  .output-block summary { padding: 8px 12px; cursor: pointer; font-size: 12px; color: var(--ink-dim); background: var(--bg-alt); display: flex; align-items: center; gap: 8px; }
  .output-block summary:hover { color: var(--ink); }
  .output-pre { margin: 0; padding: 12px; font-family: var(--mono); font-size: 11px; color: var(--ink-dim); background: var(--bg-deep); max-height: 220px; overflow: auto; white-space: pre-wrap; word-break: break-word; }

  /* modals */
  .modal-backdrop { position: fixed; inset: 0; background: rgba(4,6,12,0.7); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; }
  .modal { background: var(--panel-2); border: 1px solid var(--line); border-radius: 14px; width: min(680px, 92vw); max-height: 80vh; display: flex; flex-direction: column; overflow: hidden; }
  .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid var(--line-soft); }
  .modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 12px 16px; border-top: 1px solid var(--line-soft); }
  .json-pre { margin: 0; padding: 16px; overflow: auto; font-family: var(--mono); font-size: 12px; color: var(--ink-dim); max-height: 60vh; white-space: pre-wrap; word-break: break-word; }
  .load-list { padding: 10px 16px; overflow-y: auto; }
  .load-item { display: flex; align-items: center; gap: 10px; padding: 10px 6px; border-bottom: 1px solid var(--line-soft); }
  .load-item:last-child { border-bottom: none; }
  .li-main { flex: 1; min-width: 0; }
  .li-name { font-size: 13px; color: var(--ink); }
  .li-sub { font-size: 11px; color: var(--ink-faint); margin-top: 2px; }
</style>
