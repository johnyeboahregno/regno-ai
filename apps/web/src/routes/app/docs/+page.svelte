<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { marked } from 'marked';
  import HealthGrid from '$lib/HealthGrid.svelte';

  function renderMarkdown(md: string): string {
    return marked.parse(md, { async: false }) as string;
  }

  function basename(p: string): string {
    return p.split('/').pop() ?? p;
  }

  async function renderMermaidDiagrams() {
    const blocks = Array.from(document.querySelectorAll('.content code.language-mermaid'));
    if (!blocks.length) return;
    // Load mermaid lazily on the client only (its DOM code breaks SSR).
    const mermaid = (await import('mermaid')).default;
    mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
    for (const block of blocks) {
      const code = block.textContent ?? '';
      try {
        const { svg } = await mermaid.render('m' + Math.random().toString(36).slice(2), code);
        const wrapper = document.createElement('div');
        wrapper.innerHTML = svg;
        wrapper.style.display = 'flex';
        wrapper.style.justifyContent = 'center';
        wrapper.style.overflowX = 'auto';
        block.parentElement?.replaceWith(wrapper);
      } catch (e) {
        console.warn('mermaid render failed', e);
      }
    }
  }

  let total = 0;
  let groups: Array<{ domain: string; count: number; docs: Array<{ title: string; sourceUrl: string }> }> = [];
  let artifacts: Array<{ taskId: string; title: string; agentSlug: string; createdAt: string }> = [];
  let selected: { title: string; content: string; meta: string } | null = null;
  let html = '';
  let loading = false;
  let collapsed: Record<string, boolean> = {};

  type HealthEvent = { id: string; label: string; status: 'success' | 'failed'; date?: string; detail?: string };
  let health: { builds: HealthEvent[]; tests: HealthEvent[]; deployments: HealthEvent[] } = {
    builds: [],
    tests: [],
    deployments: [],
  };

  async function setSelected(title: string, content: string, meta: string) {
    selected = { title, content, meta };
    html = renderMarkdown(content);
    await tick();
    await renderMermaidDiagrams();
  }

  function toggleSection(key: string) {
    collapsed = { ...collapsed, [key]: !collapsed[key] };
  }

  async function load() {
    try {
      const [dr, ar, hr] = await Promise.all([
        fetch('/api/docs').then((r) => r.json()),
        fetch('/api/artifacts').then((r) => r.json()),
        fetch('/api/system-health').then((r) => r.json()),
      ]);
      if (dr.ok) {
        total = dr.total;
        groups = dr.groups;
        // Collapse all sections by default.
        const c: Record<string, boolean> = { artifacts: true };
        for (const g of groups) c[g.domain] = true;
        collapsed = c;
      }
      if (ar.ok) artifacts = ar.artifacts;
      if (hr.ok) health = { builds: hr.builds ?? [], tests: hr.tests ?? [], deployments: hr.deployments ?? [] };
    } catch {
      /* ignore */
    }
  }

  async function openDoc(d: { title: string; sourceUrl: string }) {
    loading = true;
    try {
      const r = await fetch(`/api/docs/content?sourceUrl=${encodeURIComponent(d.sourceUrl)}`);
      const data = await r.json();
      if (data.ok) await setSelected(basename(data.doc.title), data.doc.content, data.doc.domain);
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
      if (d.ok) await setSelected(d.artifact.title, d.artifact.markdown, d.artifact.agentSlug ?? 'artifact');
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

<div class="health-row">
  <HealthGrid title="Builds" kind="build" events={health.builds} />
  <HealthGrid title="Tests" kind="test" events={health.tests} />
  <HealthGrid title="Deployments" kind="deploy" events={health.deployments} />
</div>

<div class="split">
  <div class="list">
    <button class="group-head" on:click={() => toggleSection('artifacts')}>
      <span class="eyebrow blue">Artifacts</span>
      <span class="chev">{collapsed['artifacts'] ? '▸' : '▾'}</span>
    </button>
    {#if !collapsed['artifacts']}
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
    {/if}

    {#each groups as g}
      <div class="mb">
        <button class="group-head" on:click={() => toggleSection(g.domain)}>
          <span class="mono small" style="color:var(--telemetry); text-transform:uppercase; letter-spacing:.08em;">
            {g.domain} <span class="faint">· {g.count}</span>
          </span>
          <span class="chev">{collapsed[g.domain] ? '▸' : '▾'}</span>
        </button>
        {#if !collapsed[g.domain]}
          <div class="panel mt" style="padding:6px 0;">
            {#each g.docs.slice(0, 20) as d}
              <button class="doc" on:click={() => openDoc(d)}>
                <span class="mono small" style="color:var(--ink-dim);">{basename(d.title)}</span>
              </button>
            {/each}
            {#if g.docs.length > 20}
              <div class="faint small" style="padding:8px 16px;">+ {g.docs.length - 20} more…</div>
            {/if}
          </div>
        {/if}
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
        <div class="content">{@html html}</div>
      </div>
    {:else}
      <div class="panel" style="padding:28px; text-align:center;">
        <p class="muted">Select a document on the left to preview it here.</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .health-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
    margin-bottom: 20px;
  }
  .split {
    display: grid;
    grid-template-columns: minmax(280px, 400px) 1fr;
    gap: 20px;
    align-items: stretch;
    height: calc(100vh - 380px);
    min-height: 420px;
  }
  .list {
    min-width: 0;
    overflow-y: auto;
    padding-right: 4px;
  }
  .preview {
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
  .content { font-size: 14px; line-height: 1.7; color: var(--ink-dim); }
  .content :global(h1), .content :global(h2), .content :global(h3), .content :global(h4) {
    font-family: var(--display);
    color: var(--ink);
    margin: 18px 0 8px;
    line-height: 1.2;
  }
  .content :global(h1) { font-size: 22px; }
  .content :global(h2) { font-size: 18px; }
  .content :global(h3) { font-size: 16px; }
  .content :global(h4) { font-size: 14px; }
  .content :global(p) { margin: 8px 0; }
  .content :global(code) {
    font-family: var(--mono);
    font-size: 12.5px;
    background: var(--bg-alt);
    padding: 2px 6px;
    border: 1px solid var(--line-soft);
    border-radius: 4px;
  }
  .content :global(pre) {
    background: var(--bg-alt);
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    padding: 14px;
    overflow-x: auto;
    margin: 12px 0;
  }
  .content :global(pre code) { background: transparent; border: 0; padding: 0; }
  .content :global(ul), .content :global(ol) { margin: 8px 0 8px 22px; }
  .content :global(li) { margin: 4px 0; }
  .content :global(a) { color: var(--signal); }
  .content :global(blockquote) { border-left: 2px solid var(--signal); padding-left: 12px; margin: 12px 0; }
  .content :global(hr) { border: 0; border-top: 1px solid var(--line); margin: 16px 0; }
  .content :global(table) { border-collapse: collapse; margin: 12px 0; }
  .content :global(th), .content :global(td) { border: 1px solid var(--line); padding: 6px 10px; font-size: 13px; }
  .content :global(th) { color: var(--ink); background: var(--bg-alt); }
  @media (max-width: 900px) {
    .split { grid-template-columns: 1fr; height: auto; }
    .list { overflow: visible; }
    .preview { overflow: visible; }
  }
</style>
