<script lang="ts">
  // Sources modal for the CORTEX Architecture tab — opened from the Data Sources node.
  // Mirrors the reference "Sources" panel: an orange header bar with a Configure button,
  // then the six ways knowledge enters CORTEX (ingestion, watched dirs, connectors,
  // SDK/API, execution learning, conversations).
  import { onMount } from 'svelte';
  import Icon from '$lib/Icon.svelte';

  export let onClose: () => void = () => {};

  let wide = false;

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }
  onMount(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const sources = [
    {
      title: 'Knowledge Ingestion',
      color: '#f0a944',
      desc: 'Knowledge Seeds pipeline — crawl, extract, enrich, embed. 3-layer relevance filter ensures quality.',
    },
    {
      title: 'Watched Directories',
      color: '#7cb8ff',
      desc: 'Local folders monitored for changes. Auto-index on file add/modify with SHA-256 dedup.',
    },
    {
      title: 'External Connectors',
      color: '#34d399',
      desc: 'Google Drive, GitHub, SharePoint, Confluence, Notion, Slack, S3. OAuth flows + scheduled indexing.',
    },
    {
      title: 'SDK & API',
      color: '#a78bfa',
      desc: 'Cross-platform SDK (npm, Python, .NET, Go) with OAuth PKCE. External apps feed knowledge via API.',
    },
    {
      title: 'Execution Learning',
      color: '#22d3ee',
      desc: 'Agent executions auto-generate wisdom, patterns, and memories. Quality Loop compounds knowledge.',
    },
    {
      title: 'Conversations',
      color: '#f2d47e',
      desc: 'Chat history, user preferences, and context captured from NEXUS and all regno.ai interactions.',
    },
  ];
</script>

<div
  class="modal-backdrop"
  role="button"
  tabindex="-1"
  aria-label="Close"
  on:click={(e) => {
    if (e.target === e.currentTarget) onClose();
  }}
  on:keydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClose();
    }
  }}
>
  <div class="modal" class:wide role="dialog" aria-modal="true" aria-label="Data Sources">
    <div class="modal-head">
      <span class="head-title">Sources</span>
      <div class="head-actions">
        <button class="btn configure" type="button">Configure</button>
        <button class="head-icon" type="button" title="Toggle size" aria-label="Toggle size" on:click={() => (wide = !wide)}>⤢</button>
        <button class="head-icon" type="button" title="Close" aria-label="Close" on:click={onClose}>✕</button>
      </div>
    </div>

    <div class="modal-body">
      <div class="panel-head">
        <h3>
          <Icon name="database" size={18} />
          <span>Data Sources</span>
        </h3>
        <p>How knowledge enters CORTEX — through ingestion pipelines, watched directories, external connectors, and the SDK.</p>
      </div>

      <div class="grid">
        {#each sources as s}
          <div class="card" style={`--accent: ${s.color};`}>
            <div class="c-title">{s.title}</div>
            <p class="c-desc">{s.desc}</p>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(4, 6, 12, 0.72);
    backdrop-filter: blur(4px);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .modal {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 14px;
    width: min(880px, 94vw);
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
  }
  .modal.wide { width: min(1180px, 97vw); }

  /* header bar — warm orange accent matching the reference */
  .modal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    background: color-mix(in srgb, #f0a944 13%, var(--panel-2));
    border-bottom: 1px solid color-mix(in srgb, #f0a944 28%, var(--line));
  }
  .head-title {
    font-family: var(--display);
    font-weight: 700;
    font-size: 15px;
    letter-spacing: 0.05em;
    color: #f0a944;
  }
  .head-actions { display: flex; align-items: center; gap: 8px; }
  .btn.configure {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    font-weight: 700;
    padding: 7px 16px;
    border: none;
    border-radius: var(--r-sm);
    background: linear-gradient(135deg, #f0a944, #f7b955);
    color: #fff;
    cursor: pointer;
    transition: filter 0.15s ease;
  }
  .btn.configure:hover { filter: brightness(1.08); }
  .head-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: var(--r-sm);
    background: transparent;
    color: var(--ink-dim);
    cursor: pointer;
    font-size: 14px;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .head-icon:hover { background: color-mix(in srgb, #f0a944 15%, transparent); color: #f0a944; }

  .modal-body {
    padding: 20px;
    overflow-y: auto;
    background-color: var(--bg-deep);
    background-image:
      linear-gradient(var(--line-soft) 1px, transparent 1px),
      linear-gradient(90deg, var(--line-soft) 1px, transparent 1px);
    background-size: 28px 28px;
    background-position: -1px -1px;
  }
  .panel-head { margin-bottom: 18px; }
  .panel-head h3 {
    font-size: 18px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .panel-head h3 :global(svg) { color: var(--signal); }
  .panel-head p {
    color: var(--ink-dim);
    font-size: 13px;
    margin-top: 4px;
    max-width: 640px;
    line-height: 1.5;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }
  .card {
    border: 1px solid var(--line-soft);
    border-radius: var(--r-sm);
    padding: 14px 16px;
    background: var(--panel);
  }
  .c-title { font-family: var(--display); font-weight: 700; font-size: 14px; color: var(--accent); }
  .c-desc {
    color: var(--ink-dim);
    font-size: 13px;
    margin-top: 6px;
    line-height: 1.5;
  }

  @media (max-width: 640px) {
    .grid { grid-template-columns: 1fr; }
  }
</style>
