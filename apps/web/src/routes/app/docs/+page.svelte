<script lang="ts">
  import { onMount } from 'svelte';

  let total = 0;
  let groups: Array<{ domain: string; count: number; docs: Array<{ title: string; sourceUrl: string }> }> = [];
  let artifacts: Array<{ taskId: string; title: string; agentSlug: string; createdAt: string }> = [];
  let active: { title: string; markdown: string } | null = null;

  async function load() {
    try {
      const [dr, ar] = await Promise.all([
        fetch('/api/docs').then((r) => r.json()),
        fetch('/api/artifacts').then((r) => r.json()),
      ]);
      if (dr.ok) {
        total = dr.total;
        groups = dr.groups;
      }
      if (ar.ok) artifacts = ar.artifacts;
    } catch {
      /* ignore */
    }
  }

  async function view(taskId: string) {
    try {
      const r = await fetch(`/api/artifacts/${taskId}`);
      const d = await r.json();
      if (d.ok) active = d.artifact;
    } catch {
      /* ignore */
    }
  }

  onMount(load);
</script>

<div class="page-head">
  <div class="eyebrow blue">Knowledge</div>
  <h1>Documentation</h1>
  <p>{total} documents in the brain, grouped by domain.</p>
</div>

<div class="eyebrow blue mb">Artifacts — what the architect has built</div>
{#if artifacts.length === 0}
  <p class="faint small mb">No artifacts yet — they are auto-documented whenever the architect builds something.</p>
{:else}
  <div class="panel mb" style="padding:6px 0;">
    {#each artifacts as a}
      <button
        on:click={() => view(a.taskId)}
        style="width:100%; display:flex; justify-content:space-between; gap:12px; padding:10px 16px; background:transparent; border:0; border-bottom:1px solid var(--line-soft); cursor:pointer; text-align:left;"
      >
        <span class="mono small" style="color:var(--ink);">{a.title}</span>
        <span class="faint small" style="white-space:nowrap;">{a.agentSlug} · {a.createdAt ? new Date(a.createdAt).toLocaleString() : '—'}</span>
      </button>
    {/each}
  </div>
{/if}

{#if active}
  <div class="panel mb" style="padding:20px;">
    <div class="eyebrow blue mb">{active.title}</div>
    <pre style="white-space:pre-wrap; font-family:var(--mono); font-size:13px; color:var(--ink-dim); line-height:1.6;">{active.markdown}</pre>
    <button class="btn ghost" on:click={() => (active = null)}>Close</button>
  </div>
{/if}

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
