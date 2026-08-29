<script lang="ts">
  import { onMount } from 'svelte';

  let total = 0;
  let groups: Array<{ domain: string; count: number; docs: Array<{ title: string; sourceUrl: string }> }> = [];
  let artifacts: Array<{ taskId: string; title: string; agentSlug: string; createdAt: string }> = [];
  let selected: { title: string; content: string; meta: string } | null = null;
  let loading = false;
  let collapsed: Record<string, boolean> = {};

  function toggleSection(key: string) {
    collapsed = { ...collapsed, [key]: !collapsed[key] };
  }

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

  async function openDoc(d: { title: string; sourceUrl: string }) {
    loading = true;
    try {
      const r = await fetch(`/api/docs/content?sourceUrl=${encodeURIComponent(d.sourceUrl)}`);
      const data = await r.json();
      if (data.ok) selected = { title: data.doc.title, content: data.doc.content, meta: data.doc.domain };
    } catch {
      /* ignore */
    } finally {
      loading = false;
    }
  }

  async function openArtifact(taskId: string) {
    loading = true;
    try {
      const r = await fetch(`/api/artifacts/${taskId}`);
      const d = await r.json();
      if (d.ok) selected = { title: d.artifact.title, content: d.artifact.markdown, meta: d.artifact.agentSlug ?? 'artifact' };
    } catch {
      /* ignore */
    } finally {
      loading = false;
    }
  }

  onMount(load);
</script>

<div class="page-head">
  <div class="eyebrow blue">Knowledge</div>
  <h1>Documentation</h1>
  <p>{total} documents in the brain, grouped by domain.</p>
</div>

<div class="split">
  <div class="list">
    <div class="eyebrow blue mb">Artifacts</div>
    {#if artifacts.length === 0}
      <p class="faint small mb">No artifacts yet — they appear when the architect builds something.</p>
    {:else}
      <div class="panel mb" style="padding:6px 0;">
        {#each artifacts as a}
          <button class="doc" on:click={() => openArtifact(a.taskId)}>
            <span class="mono small" style="color:var(--ink);">{a.title}</span>
            <span class="faint small" style="white-space:nowrap;">{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}</span>
          </button>
        {/each}
      </div>
    {/if}

    {#each groups as g}
      <div class="mb">
        <div class="mono small" style="color:var(--telemetry); text-transform:uppercase; letter-spacing:.08em;">
          {g.domain} <span class="faint">· {g.count}</span>
        </div>
        <div class="panel mt" style="padding:6px 0;">
          {#each g.docs.slice(0, 20) as d}
            <button class="doc" on:click={() => openDoc(d)}>
              <span class="mono small" style="color:var(--ink-dim);">{d.title}</span>
            </button>
          {/each}
          {#if g.docs.length > 20}
            <div class="faint small" style="padding:8px 16px;">+ {g.docs.length - 20} more…</div>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <div class="preview">
    {#if loading}
      <div class="panel" style="padding:20px;"><span class="status"><span class="dot signal"></span> loading…</span></div>
    {:else if selected}
      <div class="panel" style="padding:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div class="eyebrow blue">{selected.meta}</div>
          <span class="faint small">{selected.title}</span>
        </div>
        <pre class="content">{selected.content}</pre>
      </div>
    {:else}
      <div class="panel" style="padding:28px; text-align:center;">
        <p class="muted">Select a document on the left to preview it here.</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .split {
    display: grid;
    grid-template-columns: minmax(300px, 420px) 1fr;
    gap: 20px;
    align-items: start;
  }
  .list { min-width: 0; }
  .preview {
    position: sticky;
    top: 72px;
    max-height: calc(100vh - 90px);
    overflow-y: auto;
  }
  .doc {
    width: 100%;
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 9px 16px;
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--line-soft);
    cursor: pointer;
    text-align: left;
  }
  .doc:hover { background: rgba(91,110,245,0.06); }
  .group-head {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 4px;
    background: transparent;
    border: 0;
    cursor: pointer;
    text-align: left;
  }
  .group-head .chev { color: var(--ink-faint); font-family: var(--mono); }
  .content {
    white-space: pre-wrap;
    word-break: break-word;
    font-family: var(--mono);
    font-size: 13px;
    line-height: 1.7;
    color: var(--ink-dim);
  }
  @media (max-width: 900px) {
    .split { grid-template-columns: 1fr; }
    .preview { position: static; max-height: none; }
  }
</style>
