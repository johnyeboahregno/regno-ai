<script lang="ts">
  import { onMount } from 'svelte';
  import type { CortexHealthData } from './types.js';

  export let health: CortexHealthData | null = null;

  let groups: Array<{ domain: string; count: number; docs: Array<{ title: string; sourceUrl: string }> }> = [];
  let total = 0;
  let loading = false;

  function fmt(n: number): string {
    return (n ?? 0).toLocaleString();
  }

  onMount(async () => {
    loading = true;
    try {
      const r = await fetch('/api/docs');
      const d = await r.json();
      if (d.ok) {
        groups = d.groups ?? [];
        total = d.total ?? 0;
      }
    } catch {
      /* docs unavailable */
    }
    loading = false;
  });
</script>

{#if health}
  <div class="card mb">
    <h3 style="font-size:15px;">Knowledge Store</h3>
    <div class="k-grid mt">
      {#each health.knowledge as k}
        <div class="k-cell">
          <span class="k-glyph">{k.glyph}</span>
          <span class="k-val">{fmt(k.value)}</span>
          <span class="k-lbl">{k.label}</span>
        </div>
      {/each}
    </div>
    <div class="faint mono small mt">Total: {fmt(health.knowledgeTotal)} knowledge items</div>
  </div>
{/if}

<div class="card">
  <div style="display:flex; justify-content:space-between; align-items:baseline;">
    <h3 style="font-size:15px;">Ingested Documents</h3>
    <span class="faint mono small">{total} docs</span>
  </div>
  {#if loading}
    <p class="faint small mt">Loading…</p>
  {:else if groups.length === 0}
    <p class="faint small mt">No documents ingested yet — run <code>npm run db:seed-brain</code>.</p>
  {:else}
    <div class="docs mt">
      {#each groups as g}
        <div class="domain">
          <div class="domain-head">
            <span class="mono">{g.domain}</span>
            <span class="faint mono small">{g.count}</span>
          </div>
          <ul>
            {#each g.docs.slice(0, 8) as doc}
              <li title={doc.sourceUrl}>{doc.title}</li>
            {/each}
            {#if g.docs.length > 8}<li class="faint">+{g.docs.length - 8} more…</li>{/if}
          </ul>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .k-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
  .k-cell { display: flex; flex-direction: column; padding: 12px 14px; background: var(--panel-2); border: 1px solid var(--line-soft); border-radius: var(--r-sm); }
  .k-glyph { font-size: 16px; }
  .k-val { font-family: var(--display); font-size: 22px; font-weight: 700; margin-top: 6px; }
  .k-lbl { font-family: var(--mono); font-size: 11px; color: var(--ink-faint); }
  .docs { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
  .domain { background: var(--panel-2); border: 1px solid var(--line-soft); border-radius: var(--r-sm); padding: 12px 14px; }
  .domain-head { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
  ul { margin: 0; padding-left: 16px; }
  li { color: var(--ink-dim); font-size: 13px; margin: 3px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
