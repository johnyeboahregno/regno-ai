<script lang="ts">
  // HealthGrid — Git-style contribution grid of recent build/test/deploy events.
  // Each square is one event; green = success, red = failed. Hover for details.
  export let title: string;
  export let kind: 'build' | 'test' | 'deploy' = 'build';
  export let events: Array<{
    id: string;
    label: string;
    status: 'success' | 'failed';
    date?: string;
    detail?: string;
  }> = [];

  let tip: { x: number; y: number; html: string } | null = null;

  const verbs: Record<'build' | 'test' | 'deploy', { ok: string; fail: string }> = {
    build: { ok: 'Build succeeded', fail: 'Build failed' },
    test: { ok: 'Test passed', fail: 'Test failed' },
    deploy: { ok: 'Deployment succeeded', fail: 'Deployment failed' },
  };

  // Oldest first (left → right), like GitHub's contribution graph.
  $: ordered = [...events].reverse();
  $: successCount = events.filter((e) => e.status === 'success').length;
  $: failCount = events.length - successCount;

  function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, (c) => {
      switch (c) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        default: return '&#39;';
      }
    });
  }

  function show(e: MouseEvent, ev: { label: string; status: string; date?: string; detail?: string }) {
    const v = verbs[kind];
    const head = ev.status === 'success' ? v.ok : v.fail;
    let html = `<strong>${head}</strong>`;
    html += `<br/>${escapeHtml(ev.label)}`;
    if (ev.detail) html += `<br/><span class="tip-detail">${escapeHtml(ev.detail)}</span>`;
    if (ev.date) html += `<br/><span class="tip-date">${new Date(ev.date).toLocaleString()}</span>`;
    tip = { x: e.clientX + 14, y: e.clientY + 16, html };
  }

  function move(e: MouseEvent) {
    if (tip) tip = { ...tip, x: e.clientX + 14, y: e.clientY + 16 };
  }

  function hide() {
    tip = null;
  }
</script>

<div class="hg">
  <div class="hg-head">
    <span class="hg-title">{title}</span>
    <span class="hg-count">
      <span class="c ok">{successCount} ok</span> · <span class="c bad">{failCount} fail</span>
    </span>
  </div>

  {#if ordered.length === 0}
    <div class="hg-empty">No {title.toLowerCase()} recorded yet.</div>
  {:else}
    <div class="hg-squares">
      {#each ordered as ev (ev.id + '|' + ev.date)}
        <span
          class="sq"
          class:ok={ev.status === 'success'}
          class:bad={ev.status === 'failed'}
          role="img"
          aria-label="{ev.status === 'success' ? 'success' : 'failed'}: {ev.label}"
          on:mouseenter={(e) => show(e, ev)}
          on:mousemove={move}
          on:mouseleave={hide}
        ></span>
      {/each}
    </div>
    <div class="hg-legend">
      <span class="leg"><span class="sw ok"></span> success</span>
      <span class="leg"><span class="sw bad"></span> failed</span>
    </div>
  {/if}
</div>

{#if tip}
  <div class="tip" style="left:{tip.x}px; top:{tip.y}px;">{@html tip.html}</div>
{/if}

<style>
  .hg {
    background: var(--panel);
    border: 1px solid var(--line);
    padding: 14px 16px;
  }
  .hg-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    font-family: var(--mono);
  }
  .hg-title {
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }
  .hg-count {
    font-size: 11px;
    color: var(--ink-faint);
  }
  .c.ok { color: var(--good); }
  .c.bad { color: var(--danger); }
  .hg-squares {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }
  .sq {
    width: 10px;
    height: 10px;
    border-radius: 2px;
    background: var(--panel-2);
    cursor: default;
  }
  .sq.ok { background: var(--good); }
  .sq.bad { background: var(--danger); }
  .hg-empty {
    font-size: 12px;
    color: var(--ink-faint);
    padding: 8px 0;
  }
  .hg-legend {
    display: flex;
    gap: 14px;
    margin-top: 10px;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--ink-faint);
  }
  .leg {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .sw {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    display: inline-block;
  }
  .sw.ok { background: var(--good); }
  .sw.bad { background: var(--danger); }
  .tip {
    position: fixed;
    z-index: 100;
    pointer-events: none;
    background: #0b1119;
    border: 1px solid var(--line);
    padding: 8px 10px;
    font-family: var(--mono);
    font-size: 12px;
    line-height: 1.5;
    color: var(--ink);
    max-width: 340px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  }
  .tip :global(strong) { color: var(--ink); }
  .tip :global(.tip-date) { color: var(--ink-faint); font-size: 11px; }
  .tip :global(.tip-detail) { color: var(--ink-dim); }
</style>
