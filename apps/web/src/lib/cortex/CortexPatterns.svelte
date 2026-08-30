<script lang="ts">
  import { onMount } from 'svelte';
  import type { CatalogPattern, CatalogResponse } from './types.js';

  let catalog: CatalogResponse | null = null;
  let error = '';
  let search = '';
  let category = 'all';
  let priority = 'all';
  let minConfidence = 0;
  let foundationOnly = false;
  let stickyOnly = false;
  const selected = new Set<string>();

  let busy = false;
  let estimate: {
    patterns: number;
    tokens: number;
    costUsd: number;
    storageBytes: number;
    durationSec: number;
    warnings: string | null;
  } | null = null;
  let provisionResult: { provisioned: number; failed: number } | null = null;
  let message = '';

  let categories: string[] = [];
  let priorities: string[] = [];

  $: filtered = (() => {
    if (!catalog) return [] as CatalogPattern[];
    const q = search.toLowerCase().trim();
    return catalog.patterns.filter((p) => {
      if (category !== 'all' && p.category !== category) return false;
      if (priority !== 'all' && p.priority !== priority) return false;
      if (p.confidence < minConfidence) return false;
      if (foundationOnly && !p.foundation) return false;
      if (stickyOnly && !p.sticky) return false;
      if (q && !`${p.id} ${p.name} ${p.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
  })();

  $: selectedCount = filtered.filter((p) => selected.has(p.id)).length;

  function fmtBytes(n: number): string {
    if (n >= 1024 * 1024) return (n / (1024 * 1024)).toFixed(2) + ' MB';
    if (n >= 1024) return (n / 1024).toFixed(1) + ' KB';
    return n + ' B';
  }

  function fmtCost(n: number): string {
    return n >= 0.01 ? '$' + n.toFixed(2) : '$' + n.toFixed(5);
  }

  async function load() {
    try {
      const r = await fetch('/api/cortex/catalog');
      const d = await r.json();
      if (d.ok) {
        catalog = d;
        categories = Object.keys(d.byCategory).sort();
        priorities = Object.keys(d.byPriority).sort();
      } else {
        error = d.error ?? 'Failed to load catalog';
      }
    } catch {
      error = 'Catalog unavailable';
    }
  }

  function toggle(id: string) {
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
  }

  function selectAll() {
    for (const p of filtered) selected.add(p.id);
  }
  function clearAll() {
    selected.clear();
  }

  async function provision(dryRun: boolean) {
    busy = true;
    error = '';
    message = '';
    provisionResult = null;
    try {
      const r = await fetch('/api/cortex/patterns/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patternIds: [...selected], dryRun }),
      });
      const d = await r.json();
      if (!d.ok) {
        error = d.error ?? 'Provisioning failed';
      } else if (d.dryRun) {
        estimate = d.estimate;
      } else {
        estimate = null;
        provisionResult = { provisioned: d.provisioned, failed: d.failed };
        message = `Provisioned ${d.provisioned} pattern(s)`;
        if (d.failed) error = `${d.failed} pattern(s) failed to provision`;
        selected.clear();
      }
    } catch {
      error = 'Provisioning failed';
    } finally {
      busy = false;
    }
  }

  onMount(load);
</script>

{#if error && !catalog}<p class="error">{error}</p>{/if}

{#if catalog}
  <div class="toolbar card mb">
    <div class="row">
      <input class="input" bind:value={search} placeholder="Search patterns…" />
      <select bind:value={category}>
        <option value="all">All categories</option>
        {#each categories as c}<option value={c}>{c}</option>{/each}
      </select>
      <select bind:value={priority}>
        <option value="all">All priorities</option>
        {#each priorities as p}<option value={p}>{p}</option>{/each}
      </select>
    </div>
    <div class="row mt">
      <label class="inline">
        <input type="checkbox" bind:checked={foundationOnly} /> Foundation
      </label>
      <label class="inline">
        <input type="checkbox" bind:checked={stickyOnly} /> Sticky
      </label>
      <label class="range">
        <span class="faint mono small">Min confidence</span>
        <input type="range" min="0" max="1" step="0.05" bind:value={minConfidence} />
        <span class="mono small">{minConfidence.toFixed(2)}</span>
      </label>
    </div>
    <div class="row mt actions">
      <div class="faint mono small">{filtered.length} / {catalog.total} patterns · {selectedCount} selected</div>
      <div style="display:flex; gap:8px;">
        <button class="btn ghost" on:click={selectAll}>Select all</button>
        <button class="btn ghost" on:click={clearAll}>Clear</button>
        <button class="btn solid" disabled={busy || selectedCount === 0} on:click={() => provision(true)}>
          {busy ? 'Working…' : `Provision Selected (${selectedCount})`}
        </button>
      </div>
    </div>
  </div>

  {#if message}<p class="ok mb">{message}</p>{/if}

  {#if estimate}
    <div class="card mb estimate">
      <div class="eyebrow amber">Dry-run analysis</div>
      <div class="grid grid-4 mt">
        <div><div class="stat">{estimate.patterns}</div><div class="lbl">Patterns</div></div>
        <div><div class="stat">{estimate.tokens.toLocaleString()}</div><div class="lbl">Tokens</div></div>
        <div><div class="stat">{fmtCost(estimate.costUsd)}</div><div class="lbl">Embedding cost</div></div>
        <div><div class="stat">{fmtBytes(estimate.storageBytes)}</div><div class="lbl">Storage</div></div>
      </div>
      <div class="faint mono small mt">~{estimate.durationSec}s estimated · {estimate.warnings ?? 'no warnings'}</div>
      <div style="display:flex; gap:8px; margin-top:14px;">
        <button class="btn solid" disabled={busy} on:click={() => provision(false)}>Proceed with Provisioning</button>
        <button class="btn ghost" on:click={() => (estimate = null)}>Cancel</button>
      </div>
    </div>
  {/if}

  {#if provisionResult}
    <div class="card mb">
      <div class="eyebrow good">Provisioning complete</div>
      <p class="muted mt">{provisionResult.provisioned} provisioned · {provisionResult.failed} failed</p>
    </div>
  {/if}

  <div class="cards">
    {#each filtered as p}
      <div class="pcard" class:sel={selected.has(p.id)}>
        <label class="pcheck">
          <input type="checkbox" checked={selected.has(p.id)} on:change={() => toggle(p.id)} />
          <span class="mono">{p.id}</span>
        </label>
        <div class="pname">{p.name}</div>
        <div class="badges">
          <span class="tag signal">{p.category}</span>
          <span class="tag">{p.priority}</span>
          {#if p.foundation}<span class="tag fnd">Foundation</span>{/if}
          {#if p.sticky}<span class="tag stk">Sticky</span>{/if}
        </div>
        <p class="small muted mt">{p.description}</p>
        {#if p.nodeSequence?.length}
          <div class="mono small faint mt">{(p.nodeSequence ?? []).join(' → ')}</div>
        {/if}
        <div class="conf mt">
          <div class="conf-bar"><div class="conf-fill" style={`width:${Math.round(p.confidence * 100)}%;`}></div></div>
          <span class="mono small">{p.confidence.toFixed(2)}</span>
        </div>
      </div>
    {/each}
  </div>

  {#if filtered.length === 0}
    <div class="panel" style="padding:28px; text-align:center;">
      <p class="muted">No patterns match the current filters.</p>
    </div>
  {/if}
{/if}

<style>
  .row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
  .row .input { flex: 1; min-width: 180px; }
  .row select { flex: none; min-width: 160px; }
  .actions { justify-content: space-between; }
  .inline { display: inline-flex; align-items: center; gap: 6px; text-transform: none; letter-spacing: 0; font-family: var(--body); font-size: 13px; color: var(--ink-dim); margin: 0; }
  .range { display: inline-flex; align-items: center; gap: 10px; margin: 0; text-transform: none; letter-spacing: 0; font-family: var(--body); }
  .range input[type='range'] { width: 140px; }
  .stat { font-family: var(--display); font-size: 24px; font-weight: 800; }
  .lbl { font-family: var(--mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); margin-top: 4px; }
  .estimate { border-color: var(--telemetry); }
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
  .pcard {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--r);
    padding: 14px 16px;
    transition: border-color 0.15s ease, background 0.15s ease;
  }
  .pcard.sel { border-color: var(--signal); background: var(--signal-bg); }
  .pcheck { display: flex; align-items: center; gap: 8px; margin: 0; text-transform: none; letter-spacing: 0; font-family: var(--mono); font-size: 12px; color: var(--ink-faint); }
  .pname { font-family: var(--display); font-weight: 700; margin-top: 6px; }
  .badges { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
  .tag.fnd { color: var(--signal-blue); border-color: var(--signal-blue); }
  .tag.stk { color: var(--telemetry); border-color: var(--telemetry); }
  .conf { display: flex; align-items: center; gap: 10px; }
  .conf-bar { flex: 1; height: 6px; background: var(--line); border-radius: 999px; overflow: hidden; }
  .conf-fill { height: 100%; background: linear-gradient(90deg, var(--signal), var(--signal-2)); }

  @media (max-width: 640px) {
    .row .input { flex: 1 1 100%; min-width: 0; }
    .row select { flex: 1 1 100%; min-width: 0; }
    .range input[type='range'] { width: 100%; }
  }
</style>
