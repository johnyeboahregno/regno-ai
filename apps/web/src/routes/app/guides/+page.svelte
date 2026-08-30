<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { marked } from 'marked';

  // Every guide in src/lib/guides/*.md is auto-discovered — just drop a new .md file in.
  const raw = import.meta.glob('$lib/guides/*.md', { as: 'raw', eager: true }) as Record<string, string>;

  interface Guide {
    slug: string;
    title: string;
    markdown: string;
  }

  /** Title = first H1 in the doc if present, else derived from the filename. */
  function deriveTitle(path: string, markdown: string): string {
    const h1 = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
    if (h1) return h1.replace(/<[^>]+>/g, '').trim();
    const base = path.split('/').pop()?.replace(/\.md$/, '') ?? 'Guide';
    return base
      .split(/[-_]+/)
      .filter(Boolean)
      .map((w) => (w.toLowerCase() === 'llm' ? 'LLM' : w.charAt(0).toUpperCase() + w.slice(1)))
      .join(' ');
  }

  const guides: Guide[] = Object.entries(raw)
    .map(([path, markdown]) => ({
      slug: path.split('/').pop()?.replace(/\.md$/, '') ?? 'guide',
      title: deriveTitle(path, markdown),
      markdown,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  let selected: Guide | null = guides[0] ?? null;
  let html = '';

  async function renderMermaidDiagrams() {
    const blocks = Array.from(document.querySelectorAll('.content code.language-mermaid'));
    if (!blocks.length) return;
    const mermaid = (await import('mermaid')).default;
    mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
    for (const block of blocks) {
      const code = block.textContent ?? '';
      try {
        const { svg } = await mermaid.render('g' + Math.random().toString(36).slice(2), code);
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

  async function open(g: Guide) {
    selected = g;
    html = marked.parse(g.markdown, { async: false }) as string;
    await tick();
    await renderMermaidDiagrams();
  }

  onMount(() => {
    if (selected) void open(selected);
  });
</script>

<div class="page-head">
  <div class="eyebrow blue">Knowledge</div>
  <h1>User Guides</h1>
  <p>Hands-on how-tos for setting up and running your Regno Architect — for new devs and refreshers.</p>
</div>

<div class="split">
  <div class="list">
    {#each guides as g}
      <button class="doc" class:active={selected?.slug === g.slug} on:click={() => open(g)}>
        <span class="mono small" style="color:var(--ink);">{g.title}</span>
      </button>
    {/each}
    {#if guides.length === 0}
      <p class="faint small mb">No guides yet — add a .md file to src/lib/guides/.</p>
    {/if}
  </div>

  <div class="preview">
    {#if selected}
      <div class="panel" style="padding:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div class="eyebrow blue">Guide</div>
          <span class="faint small">{selected.title}</span>
        </div>
        <div class="content">{@html html}</div>
      </div>
    {:else}
      <div class="panel" style="padding:28px; text-align:center;">
        <p class="muted">Select a guide on the left.</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .split {
    display: grid;
    grid-template-columns: minmax(220px, 300px) 1fr;
    gap: 20px;
    align-items: stretch;
  }
  .list { min-width: 0; overflow-y: auto; padding-right: 4px; }
  .preview { overflow-y: auto; }
  .doc {
    width: 100%;
    display: block;
    padding: 10px 16px;
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--line-soft);
    cursor: pointer;
    text-align: left;
  }
  .doc:hover { background: rgba(91,110,245,0.06); }
  .doc.active { background: rgba(91,110,245,0.10); border-left: 2px solid var(--signal); }
  .content { font-size: 14px; line-height: 1.7; color: var(--ink-dim); }
  .content :global(h1), .content :global(h2), .content :global(h3), .content :global(h4) {
    font-family: var(--display); color: var(--ink); margin: 18px 0 8px; line-height: 1.2;
  }
  .content :global(h1) { font-size: 22px; }
  .content :global(h2) { font-size: 18px; }
  .content :global(h3) { font-size: 16px; }
  .content :global(h4) { font-size: 14px; }
  .content :global(p) { margin: 8px 0; }
  .content :global(code) {
    font-family: var(--mono); font-size: 12.5px; background: rgba(255,255,255,0.05);
    padding: 1px 5px; border-radius: 4px;
  }
  .content :global(pre) { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 14px; overflow-x: auto; }
  .content :global(pre code) { background: transparent; padding: 0; }
  .content :global(ul), .content :global(ol) { margin: 8px 0 8px 22px; }
  .content :global(li) { margin: 4px 0; }
  .content :global(table) { border-collapse: collapse; width: 100%; margin: 12px 0; }
  .content :global(th), .content :global(td) { border: 1px solid var(--line); padding: 6px 10px; text-align: left; }
  .content :global(a) { color: var(--signal); }
</style>
