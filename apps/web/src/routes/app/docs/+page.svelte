<script lang="ts">
  import { onMount } from 'svelte';

  let total = 0;
  let groups: Array<{ domain: string; count: number; docs: Array<{ title: string; sourceUrl: string }> }> = [];

  onMount(async () => {
    try {
      const r = await fetch('/api/docs');
      const d = await r.json();
      if (d.ok) {
        total = d.total;
        groups = d.groups;
      }
    } catch {
      /* ignore */
    }
  });
</script>

<div class="page-head">
  <div class="eyebrow blue">Knowledge</div>
  <h1>Documentation</h1>
  <p>{total} documents in the brain, grouped by domain.</p>
</div>

{#each groups as g}
  <div class="mb">
    <div class="mono small" style="color:var(--telemetry); text-transform:uppercase; letter-spacing:.08em;">
      {g.domain} <span class="faint">· {g.count}</span>
    </div>
    <div class="panel mt" style="padding:6px 0;">
      {#each g.docs.slice(0, 12) as d}
        <div style="padding:8px 16px; border-bottom:1px solid var(--line-soft); font-family:var(--mono); font-size:13px; color:var(--ink-dim);">
          {d.title}
        </div>
      {/each}
      {#if g.docs.length > 12}
        <div class="faint small" style="padding:8px 16px;">+ {g.docs.length - 12} more…</div>
      {/if}
    </div>
  </div>
{/each}

{#if groups.length === 0}
  <div class="panel" style="padding:24px;">
    <p class="muted">No documents ingested yet.</p>
    <p class="small faint mt">Run <code>npm run db:seed-brain</code> (and <code>db:seed-history</code>) with the databases up to populate the knowledge base.</p>
  </div>
{/if}
