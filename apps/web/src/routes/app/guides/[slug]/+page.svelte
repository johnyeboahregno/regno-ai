<script lang="ts">
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { tick } from 'svelte';
  import { marked } from 'marked';
  import { getGuide } from '$lib/guides';

  let html = '';

  async function renderMermaidDiagrams() {
    const blocks = Array.from(document.querySelectorAll('.content code.language-mermaid'));
    if (!blocks.length) return;
    // Load mermaid lazily on the client only (its DOM code breaks SSR).
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

  $: slug = $page.params.slug;
  $: guide = slug ? getGuide(slug) : undefined;
  $: if (guide) {
    html = marked.parse(guide.markdown, { async: false }) as string;
    if (browser) void tick().then(() => renderMermaidDiagrams());
  }
</script>

{#if guide}
  <div class="page-head">
    <div class="eyebrow blue">Guide</div>
    <h1>{guide.title}</h1>
  </div>

  <div class="panel" style="padding:24px;">
    <div class="content">{@html html}</div>
  </div>
{:else}
  <div class="page-head">
    <div class="eyebrow blue">Knowledge</div>
    <h1>User Guides</h1>
  </div>
  <div class="panel" style="padding:28px; text-align:center;">
    <p class="muted">That guide wasn't found. Choose one from the sidebar.</p>
  </div>
{/if}

<style>
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
    font-family: var(--mono); font-size: 12.5px; background: var(--bg-alt);
    padding: 2px 6px; border: 1px solid var(--line-soft); border-radius: 4px;
  }
  .content :global(pre) { background: var(--bg-alt); border: 1px solid var(--line-soft); border-radius: 8px; padding: 14px; overflow-x: auto; margin: 12px 0; }
  .content :global(pre code) { background: transparent; border: 0; padding: 0; }
  .content :global(ul), .content :global(ol) { margin: 8px 0 8px 22px; }
  .content :global(li) { margin: 4px 0; }
  .content :global(table) { border-collapse: collapse; width: 100%; margin: 12px 0; display: block; overflow-x: auto; }
  .content :global(th), .content :global(td) { border: 1px solid var(--line); padding: 6px 10px; text-align: left; }
  .content :global(a) { color: var(--signal); }
  .content :global(blockquote) { border-left: 2px solid var(--signal); padding-left: 12px; margin: 12px 0; }
</style>
