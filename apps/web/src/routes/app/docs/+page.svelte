<script lang="ts">
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { tick } from 'svelte';
  import { marked } from 'marked';

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

  let html = '';
  let loading = false;
  let error = '';
  let meta = '';
  let title = '';

  function resetView() {
    html = '';
    error = '';
    loading = false;
    meta = '';
    title = '';
  }

  async function loadDoc(sourceUrl: string) {
    loading = true;
    error = '';
    try {
      const r = await fetch(`/api/docs/content?sourceUrl=${encodeURIComponent(sourceUrl)}`);
      const data = await r.json();
      if (data.ok) {
        meta = data.doc.domain ?? 'docs';
        title = basename(data.doc.title);
        html = renderMarkdown(data.doc.content);
        await tick();
        await renderMermaidDiagrams();
      } else {
        error = data.error ?? 'Document not found';
        html = '';
      }
    } catch {
      error = 'Failed to load document';
      html = '';
    } finally {
      loading = false;
    }
  }

  async function loadArtifact(taskId: string) {
    loading = true;
    error = '';
    try {
      const r = await fetch(`/api/artifacts/${encodeURIComponent(taskId)}`);
      const d = await r.json();
      if (d.ok) {
        meta = d.artifact.agentSlug ?? 'artifact';
        title = d.artifact.title;
        html = renderMarkdown(d.artifact.markdown);
        await tick();
        await renderMermaidDiagrams();
      } else {
        error = d.error ?? 'Artifact not found';
        html = '';
      }
    } catch {
      error = 'Failed to load artifact';
      html = '';
    } finally {
      loading = false;
    }
  }

  // React to the sidebar submenu selection (?doc=… or ?artifact=…).
  $: {
    const doc = $page.url.searchParams.get('doc');
    const artifact = $page.url.searchParams.get('artifact');
    if (browser) {
      if (doc) void loadDoc(doc);
      else if (artifact) void loadArtifact(artifact);
      else resetView();
    }
  }
</script>

<div class="page-head">
  <div class="eyebrow blue">Knowledge</div>
  <h1>Documentation</h1>
  <p>Choose a document from the sidebar to read it here.</p>
</div>

{#if loading}
  <div class="panel" style="padding:20px;"><span class="status"><span class="dot signal"></span> loading…</span></div>
{:else if error}
  <div class="panel" style="padding:20px;"><p class="error">{error}</p></div>
{:else if html}
  <div class="panel" style="padding:24px;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <div class="eyebrow blue">{meta}</div>
      <span class="faint small">{title}</span>
    </div>
    <div class="content">{@html html}</div>
  </div>
{:else}
  <div class="panel" style="padding:28px; text-align:center;">
    <p class="muted">Select a document from the sidebar to read it here.</p>
  </div>
{/if}

<style>
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
</style>
