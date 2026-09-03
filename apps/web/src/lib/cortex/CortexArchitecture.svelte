<script lang="ts">
  // CORTEX Architecture — visual overview of the memory & knowledge system.
  // Mirrors the reference dashboard: live status boxes, an SVG flow diagram
  // (Data Sources → stores → Cortex Flow → Redis/BullMQ), legend + metrics tiles.
  // All service state comes from GET /api/cortex/health (graceful when offline).
  import type { CortexHealthData, CortexService } from './types.js';
  import CortexSourcesModal from './CortexSourcesModal.svelte';
  import CortexVectorDbModal from './CortexVectorDbModal.svelte';

  export let health: CortexHealthData | null = null;
  export let autoRefresh = true;
  export let onToggleAutoRefresh: () => void = () => {};
  export let onRefresh: () => void = () => {};

  // --- helpers -------------------------------------------------------------
  function svc(key: string): CortexService | undefined {
    return health?.services.find((s) => s.key === key);
  }
  function statusText(s?: CortexService): string {
    if (!s) return 'Offline';
    if (s.status === 'online') return 'Connected';
    if (s.status === 'degraded') return 'Degraded';
    if (s.status === 'idle') return 'Idle';
    return 'Offline';
  }
  function isUp(s?: CortexService): boolean {
    return !!s && s.status === 'online';
  }
  function fmt(n: number): string {
    return (n ?? 0).toLocaleString();
  }
  function time(iso?: string): string {
    return iso ? new Date(iso).toLocaleTimeString() : '—';
  }

  // --- flow nodes ----------------------------------------------------------
  const sources = { title: 'Data Sources', sub: 'Ingestion · Watched Dirs · Connectors · SDK', color: '#8b93ad' };
  const stores: Array<{ key: string; title: string; sub: string; color: string }> = [
    { key: 'qdrant', title: 'Vector DB', sub: 'Qdrant', color: '#4f8dff' },
    { key: 'neo4j', title: 'Graph DB', sub: 'Neo4j', color: '#34d399' },
    { key: 'mongo', title: 'Document DB', sub: 'MongoDB', color: '#8d7bff' },
    { key: 'embedding', title: 'Embedding', sub: 'LLM · Reasoning', color: '#f0a944' },
  ];
  const flow = { title: 'Cortex Flow — Reasoning Layer', sub: 'Agents · Tools · Orchestration · Quality Loop · Wisdom', color: '#f0a944' };
  const backing: Array<{ key: string; title: string; sub: string; color: string }> = [
    { key: 'redis', title: 'Redis', sub: 'Cache · Pub/Sub · Queue Backing', color: '#f0555a' },
    { key: 'bullmq', title: 'BullMQ', sub: 'Queues · Workers', color: '#8d7bff' },
  ];

  // --- status boxes (6) + overall -----------------------------------------
  const boxes: Array<{ key: string; title: string; color: string }> = [
    { key: 'qdrant', title: 'Vector DB', color: '#4f8dff' },
    { key: 'neo4j', title: 'Graph DB', color: '#34d399' },
    { key: 'mongo', title: 'Document DB', color: '#8d7bff' },
    { key: 'embedding', title: 'Embedding', color: '#f0a944' },
    { key: 'redis', title: 'Redis', color: '#f0555a' },
    { key: 'bullmq', title: 'BullMQ', color: '#8d7bff' },
  ];

  function overall(): { label: string; cls: string } {
    const statuses = boxes.map((b) => svc(b.key)?.status ?? 'offline');
    if (statuses.every((s) => s === 'online')) return { label: 'ONLINE', cls: 'ok' };
    if (statuses.some((s) => s === 'offline')) return { label: 'OFFLINE', cls: 'bad' };
    return { label: 'DEGRADED', cls: 'amber' };
  }

  // --- metrics tiles -------------------------------------------------------
  const tiles: Array<{ key: string; glyph: string; label: string; learned?: boolean }> = [
    { key: 'documents', glyph: '📄', label: 'Documents' },
    { key: 'facts', glyph: '◆', label: 'Facts' },
    { key: 'wisdom', glyph: '★', label: 'Wisdom' },
    { key: 'memories', glyph: '●', label: 'Memories' },
    { key: 'entities', glyph: '⬡', label: 'Entities' },
    { key: 'patterns', glyph: '◎', label: 'Patterns' },
    { key: 'learned', glyph: '🧠', label: 'Learned', learned: true },
    { key: 'evaluations', glyph: '🍎', label: 'Evaluations' },
    { key: 'executions', glyph: '⚡', label: 'Executions' },
  ];
  function tileVal(t: (typeof tiles)[number]): number {
    if (t.learned) return health?.knowledgeTotal ?? 0;
    return health?.knowledge.find((k) => k.key === t.key)?.value ?? 0;
  }

  // --- click to configure / view status ------------------------------------
  let selected: { title: string; sub: string; detail: string; status: string; color: string } | null = null;
  let sourcesOpen = false;
  let vectorDbOpen = false;
  function open(node: { key: string; title: string; sub: string; color: string }) {
    // Vector DB opens its dedicated configuration modal; other nodes show the status card.
    if (node.key === 'qdrant') {
      vectorDbOpen = true;
      return;
    }
    const s = svc(node.key);
    selected = {
      title: node.title,
      sub: s?.role ?? node.sub,
      detail: s?.detail ?? 'No live health data yet — start the stack and refresh.',
      status: statusText(s),
      color: node.color,
    };
  }
</script>

<div class="bar">
  <span class="pill {overall().cls}"><span class="dot"></span>Overall Status: {overall().label}</span>
  <div class="controls">
    <button class="btn-mini" on:click={onToggleAutoRefresh}>Auto-refresh {autoRefresh ? 'ON' : 'OFF'}</button>
    <button class="btn-mini refresh" on:click={onRefresh}>↻ Refresh</button>
    <span class="last">Last check: {time(health?.checkedAt)}</span>
  </div>
</div>

<div class="boxes">
  {#each boxes as b}
    {@const s = svc(b.key)}
    <div
      class="box"
      class:online={isUp(s)}
      style={`--accent: ${b.color};`}
      role="button"
      tabindex="0"
      on:click={() => open({ key: b.key, title: b.title, sub: s?.role ?? '', color: b.color })}
      on:keydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open({ key: b.key, title: b.title, sub: s?.role ?? '', color: b.color });
        }
      }}
    >
      <span class="swatch" style="background:{b.color};"></span>
      <div>
        <div class="b-name">{b.title}</div>
        <div class="b-status">{statusText(s)}</div>
      </div>
    </div>
  {/each}
</div>

<div class="arch-panel">
  <div class="arch-head">
    <h2 class="arch-title">⌘ CORTEX Architecture</h2>
  </div>
  <p class="arch-sub">Click on any component to configure its connection and view status</p>

  <div class="flow">
    <!-- Data Sources -->
    <div
      class="node data-src"
      style={`--accent: ${sources.color};`}
      role="button"
      tabindex="0"
      on:click={() => (sourcesOpen = true)}
      on:keydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          sourcesOpen = true;
        }
      }}
    >
      <div class="n-title">{sources.title}</div>
      <div class="n-sub">{sources.sub}</div>
    </div>

    <!-- Data Sources → stores -->
    <svg class="conn" viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden="true">
      <path d="M50 0 V13" />
      <path d="M12.5 13 H87.5" />
      <path d="M12.5 13 V26 M37.5 13 V26 M62.5 13 V26 M87.5 13 V26" />
    </svg>

    <!-- stores -->
    <div class="stores">
      {#each stores as n}
        {@const s = svc(n.key)}
        <div
          class="node"
          style={`--accent: ${n.color};`}
          class:dim={!isUp(s)}
          role="button"
          tabindex="0"
          on:click={() => open({ key: n.key, title: n.title, sub: s?.role ?? n.sub, color: n.color })}
          on:keydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              open({ key: n.key, title: n.title, sub: s?.role ?? n.sub, color: n.color });
            }
          }}
        >
          <div class="n-title">{n.title}</div>
          <div class="n-sub">{n.sub}</div>
          <div class="n-status">
            <span class="n-dot" class:up={isUp(s)} class:down={!isUp(s)}></span>
            <span>{statusText(s)}</span>
          </div>
        </div>
      {/each}
    </div>

    <!-- stores → Cortex Flow -->
    <svg class="conn" viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden="true">
      <path d="M12.5 0 V13 M37.5 0 V13 M62.5 0 V13 M87.5 0 V13" />
      <path d="M12.5 13 H87.5" />
      <path d="M50 13 V26" />
    </svg>

    <!-- Cortex Flow -->
    <div class="node plain cortex" style={`--accent: ${flow.color};`}>
      <div class="n-title">{flow.title}</div>
      <div class="n-sub">{flow.sub}</div>
    </div>

    <!-- Cortex Flow → backing -->
    <svg class="conn" viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden="true">
      <path d="M50 0 V13" />
      <path d="M25 13 H75" />
      <path d="M25 13 V26 M75 13 V26" />
    </svg>

    <!-- backing stores -->
    <div class="bottom-row">
      {#each backing as n}
        {@const s = svc(n.key)}
        <div
          class="node"
          style={`--accent: ${n.color};`}
          class:dim={!isUp(s)}
          role="button"
          tabindex="0"
          on:click={() => open({ key: n.key, title: n.title, sub: s?.role ?? n.sub, color: n.color })}
          on:keydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              open({ key: n.key, title: n.title, sub: s?.role ?? n.sub, color: n.color });
            }
          }}
        >
          <div class="n-title">{n.title}</div>
          <div class="n-sub">{n.sub}</div>
          <div class="n-status">
            <span class="n-dot" class:up={isUp(s)} class:down={!isUp(s)}></span>
            <span>{statusText(s)}</span>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- legend -->
  <div class="legend">
    <span class="lg"><span class="lg-dot"></span>Configured</span>
    <span class="lg"><span class="lg-dot off"></span>Not Configured</span>
    <span class="lg"><span class="lg-box"></span>Click to Configure</span>
  </div>

  <!-- selected component detail -->
  {#if selected}
    <div class="detail" style={`--accent: ${selected.color};`}>
      <span class="d-swatch" style="background:{selected.color};"></span>
      <div class="d-body">
        <div class="d-head">
          <span class="d-title">{selected.title}</span>
          <span class="d-status" class:up={selected.status === 'Connected'} class:down={selected.status === 'Offline'}>{selected.status}</span>
        </div>
        <div class="d-sub">{selected.sub}</div>
        <div class="d-detail">{selected.detail}</div>
      </div>
      <button class="btn-mini d-close" on:click={() => (selected = null)}>✕</button>
    </div>
  {/if}
</div>

<div class="metrics">
  {#each tiles as t}
    <div class="metric">
      <div class="m-glyph">{t.glyph}</div>
      <div class="m-val">{fmt(tileVal(t))}</div>
      <div class="m-lbl">{t.label}</div>
    </div>
  {/each}
</div>

{#if sourcesOpen}
  <CortexSourcesModal onClose={() => (sourcesOpen = false)} />
{/if}

{#if vectorDbOpen}
  <CortexVectorDbModal onClose={() => (vectorDbOpen = false)} />
{/if}

<style>
  /* header bar */
  .bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    margin-bottom: 18px;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 6px 14px;
    border: 1px solid var(--line);
    border-radius: 999px;
    color: var(--ink-dim);
    background: var(--panel);
  }
  .pill .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ink-faint); }
  .pill.ok {
    color: var(--good);
    border-color: color-mix(in srgb, var(--good) 45%, transparent);
    background: color-mix(in srgb, var(--good) 10%, transparent);
  }
  .pill.ok .dot { background: var(--good); box-shadow: 0 0 8px var(--good); }
  .pill.bad {
    color: var(--danger);
    border-color: color-mix(in srgb, var(--danger) 45%, transparent);
    background: color-mix(in srgb, var(--danger) 10%, transparent);
  }
  .pill.bad .dot { background: var(--danger); box-shadow: 0 0 8px var(--danger); }
  .pill.amber {
    color: var(--telemetry);
    border-color: color-mix(in srgb, var(--telemetry) 45%, transparent);
    background: color-mix(in srgb, var(--telemetry) 10%, transparent);
  }
  .pill.amber .dot { background: var(--telemetry); }

  .controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .btn-mini {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.04em;
    padding: 6px 12px;
    border: 1px solid var(--line);
    background: transparent;
    color: var(--ink-dim);
    border-radius: var(--r-sm);
    cursor: pointer;
    transition: color 0.15s ease, border-color 0.15s ease;
  }
  .btn-mini:hover { color: var(--ink); border-color: var(--ink-faint); }
  .btn-mini.refresh { border-color: var(--signal); color: var(--signal); }
  .btn-mini.refresh:hover { background: var(--signal-bg); }
  .last { font-family: var(--mono); font-size: 11px; color: var(--ink-faint); }

  /* status boxes */
  .boxes {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
    margin-bottom: 20px;
  }
  .box {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid var(--line);
    border-radius: var(--r-sm);
    background: var(--panel-2);
    cursor: pointer;
    transition: border-color 0.15s ease, transform 0.12s ease;
  }
  .box:hover { transform: translateY(-1px); }
  .box.online {
    border-color: color-mix(in srgb, var(--good) 45%, transparent);
    background: color-mix(in srgb, var(--good) 7%, var(--panel-2));
  }
  .swatch { width: 10px; height: 10px; border-radius: 3px; flex: none; box-shadow: 0 0 8px var(--accent); }
  .b-name { font-family: var(--display); font-size: 13.5px; font-weight: 700; }
  .b-status {
    font-family: var(--mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--ink-faint);
    margin-top: 1px;
  }
  .box.online .b-status { color: var(--good); }

  /* architecture panel */
  .arch-panel {
    border: 1px solid var(--line);
    border-radius: var(--r);
    background: var(--panel);
    padding: 20px 20px 18px;
    margin-bottom: 20px;
  }
  .arch-title { font-size: 16px; letter-spacing: 0.01em; }
  .arch-sub { color: var(--ink-faint); font-size: 12.5px; margin: 4px 0 18px; }

  /* flowchart */
  .flow { display: flex; flex-direction: column; align-items: stretch; }
  .conn { width: 100%; height: 26px; display: block; flex: none; }
  .conn path {
    stroke: color-mix(in srgb, var(--ink) 42%, transparent);
    stroke-width: 1.4;
    stroke-dasharray: 4 5;
    fill: none;
    vector-effect: non-scaling-stroke;
  }
  .node {
    position: relative;
    border-radius: 10px;
    padding: 12px 14px;
    border: 1px solid color-mix(in srgb, var(--accent) 70%, transparent);
    background: color-mix(in srgb, var(--accent) 12%, var(--panel));
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 12%, transparent), 0 2px 10px color-mix(in srgb, var(--accent) 8%, transparent);
    text-align: center;
    cursor: pointer;
    transition: transform 0.12s ease, box-shadow 0.12s ease;
  }
  .node:hover { transform: translateY(-1px); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent), 0 8px 22px color-mix(in srgb, var(--accent) 22%, transparent); }
  .node.plain { cursor: default; }
  .node.plain:hover { transform: none; }
  .node.dim { border-color: var(--line); box-shadow: none; background: var(--panel-2); }
  .node .n-title { font-family: var(--display); font-size: 14px; font-weight: 700; }
  .node .n-sub { font-size: 11.5px; opacity: 0.82; margin-top: 2px; }
  .node .n-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 8px;
    font-family: var(--mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .n-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--ink-faint); }
  .n-dot.up { background: var(--good); box-shadow: 0 0 8px var(--good); }
  .n-dot.down { background: var(--danger); }
  .node.dim .n-status { color: var(--ink-faint); }

  .data-src { max-width: 340px; margin: 0 auto; width: 100%; }
  .stores { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
  .bottom-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

  /* legend */
  .legend {
    display: flex;
    gap: 18px;
    margin-top: 18px;
    flex-wrap: wrap;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--ink-faint);
    letter-spacing: 0.03em;
  }
  .lg { display: inline-flex; align-items: center; gap: 7px; }
  .lg-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--good); }
  .lg-dot.off { background: var(--ink-faint); }
  .lg-box { width: 10px; height: 10px; border: 1px dashed var(--ink-faint); border-radius: 3px; }

  /* detail popover */
  .detail {
    margin-top: 16px;
    border: 1px dashed color-mix(in srgb, var(--accent) 55%, var(--line));
    border-radius: var(--r-sm);
    padding: 12px 14px;
    background: var(--bg-alt);
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }
  .d-swatch { width: 10px; height: 10px; border-radius: 3px; flex: none; margin-top: 5px; box-shadow: 0 0 8px var(--accent); }
  .d-body { flex: 1; min-width: 0; }
  .d-head { display: flex; align-items: center; gap: 10px; }
  .d-title { font-family: var(--display); font-weight: 700; font-size: 14px; }
  .d-status { font-family: var(--mono); font-size: 11px; text-transform: uppercase; color: var(--ink-faint); }
  .d-status.up { color: var(--good); }
  .d-status.down { color: var(--danger); }
  .d-sub { font-size: 12.5px; color: var(--ink-dim); margin-top: 2px; }
  .d-detail { font-family: var(--mono); font-size: 12px; color: var(--ink-faint); margin-top: 6px; }
  .d-close { margin-left: auto; }

  /* metrics tiles */
  .metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 14px;
  }
  .metric {
    position: relative;
    min-height: 132px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 18px 20px;
    border: 1px solid var(--line);
    border-radius: var(--r);
    overflow: hidden;
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--panel-2) 72%, transparent), transparent 64%),
      var(--panel);
    box-shadow: inset 0 1px 0 color-mix(in srgb, var(--ink) 6%, transparent);
  }
  .metric::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 3px;
    background: linear-gradient(180deg, var(--signal), var(--signal-blue));
    opacity: 0.72;
  }
  .metric::after {
    content: '';
    position: absolute;
    right: -44px;
    top: -52px;
    width: 132px;
    height: 132px;
    border: 1px solid color-mix(in srgb, var(--signal) 22%, transparent);
    border-radius: 50%;
    opacity: 0.55;
  }
  .m-glyph {
    position: relative;
    z-index: 1;
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    background: color-mix(in srgb, var(--bg-alt) 70%, transparent);
    color: var(--ink);
    font-size: 15px;
  }
  .m-val {
    position: relative;
    z-index: 1;
    font-family: var(--display);
    font-size: 36px;
    line-height: 1;
    font-weight: 800;
    margin-top: 18px;
    color: var(--ink);
    letter-spacing: 0;
  }
  .m-lbl {
    position: relative;
    z-index: 1;
    font-family: var(--mono);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.13em;
    color: var(--ink-faint);
    margin-top: 10px;
  }
  @media (max-width: 640px) {
    .metrics { grid-template-columns: 1fr; }
    .metric { min-height: 118px; }
    .m-val { font-size: 32px; }
  }
</style>
