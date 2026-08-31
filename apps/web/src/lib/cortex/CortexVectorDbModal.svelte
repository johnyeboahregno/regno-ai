<script lang="ts">
  // Vector DB configuration modal for the CORTEX Architecture tab — opened from the
  // Vector DB node. Mirrors the reference "Vector Db" panel: a Configure tab with the
  // Qdrant connection form (+ Test Connection), a Browse tab listing collections, and a
  // footer with Last saved + Save.
  import { onMount } from 'svelte';
  import Icon from '$lib/Icon.svelte';

  export let onClose: () => void = () => {};

  let tab: 'configure' | 'browse' = 'configure';
  let wide = false;

  // connection form state
  let credential = 'cortex_memories (qdrant)';
  let provider = 'qdrant';
  let host = 'localhost';
  let port = '6333';
  let collection = 'cortex_memories';
  let lastSaved = '11/23/2025, 1:44:17 AM';
  let testing = false;
  let testResult: '' | 'ok' | 'fail' = '';
  let savedFlash = false;

  // --- Browse tab state (live Qdrant data via GET /api/cortex/qdrant/browse) ---
  const PAGE = 20;
  let collections: Array<{ name: string; points: number }> = [];
  let selected = '';
  let points: Array<{ id: number | string; payload: Record<string, unknown> }> = [];
  let total = 0;
  let nextOffset: number | string | Record<string, unknown> | null = null;
  let offsetStack: Array<number | string | Record<string, unknown> | null> = [null];
  let loading = false;
  let browseError = '';

  async function loadCollections() {
    loading = true;
    browseError = '';
    try {
      const r = await fetch('/api/cortex/qdrant/browse');
      const d = await r.json();
      if (d.ok) {
        collections = d.collections ?? [];
        if (collections.length && !selected) {
          selected = collections[0].name;
          loadPoints();
        }
      } else {
        browseError = d.error ?? 'Qdrant unreachable';
      }
    } catch {
      browseError = 'Qdrant unreachable';
    }
    loading = false;
  }

  async function loadPoints() {
    if (!selected) return;
    loading = true;
    browseError = '';
    try {
      const offset = offsetStack[offsetStack.length - 1];
      const qs = new URLSearchParams({ collection: selected, limit: String(PAGE) });
      if (offset !== null && offset !== undefined) qs.set('offset', JSON.stringify(offset));
      const r = await fetch(`/api/cortex/qdrant/browse?${qs.toString()}`);
      const d = await r.json();
      if (d.ok) {
        points = d.points ?? [];
        total = d.total ?? 0;
        nextOffset = d.nextOffset ?? null;
      } else {
        browseError = d.error ?? 'Qdrant unreachable';
      }
    } catch {
      browseError = 'Qdrant unreachable';
    }
    loading = false;
  }

  function selectCollection(name: string) {
    selected = name;
    offsetStack = [null];
    points = [];
    total = 0;
    nextOffset = null;
    loadPoints();
  }

  function nextPage() {
    if (nextOffset === null || nextOffset === undefined) return;
    offsetStack = [...offsetStack, nextOffset];
    loadPoints();
  }

  function prevPage() {
    if (offsetStack.length <= 1) return;
    offsetStack = offsetStack.slice(0, -1);
    loadPoints();
  }

  function openBrowse() {
    tab = 'browse';
    if (!collections.length) loadCollections();
  }

  $: pageStart = (offsetStack.length - 1) * PAGE + 1;
  $: pageEnd = Math.min(pageStart + points.length - 1, total);

  // JSON syntax highlighting for payloads (keys white, strings teal, numbers blue).
  function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function pretty(value: unknown, depth = 0): string {
    const pad = '  '.repeat(depth);
    const pad2 = '  '.repeat(depth + 1);
    if (value === null) return '<span class="j-null">null</span>';
    if (typeof value === 'string') return `<span class="j-str">"${esc(value)}"</span>`;
    if (typeof value === 'number') return `<span class="j-num">${value}</span>`;
    if (typeof value === 'boolean') return `<span class="j-bool">${value}</span>`;
    if (Array.isArray(value)) {
      if (value.length === 0) return '<span class="j-punct">[]</span>';
      const inner = value.map((v) => pretty(v, depth + 1)).join('<span class="j-punct">, </span>');
      return '<span class="j-punct">[</span>' + inner + '<span class="j-punct">]</span>';
    }
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '<span class="j-punct">{}</span>';
    const inner = entries
      .map(([k, v]) => `${pad2}<span class="j-key">"${esc(k)}"</span><span class="j-punct">:</span> ${pretty(v, depth + 1)}`)
      .join('<span class="j-punct">,</span>\n');
    return '<span class="j-punct">{</span>\n' + inner + '\n' + pad + '<span class="j-punct">}</span>';
  }
  function formatId(id: number | string): string {
    return String(id);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }
  onMount(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  async function testConnection() {
    testing = true;
    testResult = '';
    try {
      const r = await fetch('/api/cortex/health');
      const d = await r.json();
      const q = d?.services?.find((s: { key: string }) => s.key === 'qdrant');
      testResult = q?.status === 'online' ? 'ok' : 'fail';
    } catch {
      testResult = 'fail';
    }
    testing = false;
  }

  function save() {
    lastSaved = new Date().toLocaleString();
    savedFlash = true;
    setTimeout(() => (savedFlash = false), 2000);
  }
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
  <div class="modal" class:wide role="dialog" aria-modal="true" aria-label="Vector Database Configuration">
    <div class="modal-head">
      <span class="head-title">Vector Db</span>
      <div class="head-tabs" role="tablist">
        <button
          class="htab"
          class:active={tab === 'configure'}
          role="tab"
          aria-selected={tab === 'configure'}
          type="button"
          on:click={() => (tab = 'configure')}
        >Configure</button>
        <button
          class="htab"
          class:active={tab === 'browse'}
          role="tab"
          aria-selected={tab === 'browse'}
          type="button"
          on:click={openBrowse}
        >Browse</button>
      </div>
      <div class="head-icons">
        <button class="head-icon" type="button" title="Toggle size" aria-label="Toggle size" on:click={() => (wide = !wide)}>⤢</button>
        <button class="head-icon" type="button" title="Close" aria-label="Close" on:click={onClose}>✕</button>
      </div>
    </div>

    {#if tab === 'configure'}
      <div class="modal-body">
        <div class="config-head">
          <h3>Vector Database Configuration</h3>
          <button class="btn test" type="button" on:click={testConnection} disabled={testing}>
            {testing ? 'Testing…' : 'Test Connection'}
          </button>
        </div>

        {#if testResult}
          <p class="test-result" class:ok={testResult === 'ok'} class:fail={testResult === 'fail'}>
            {testResult === 'ok' ? '✓ Connected' : '✕ Failed to connect'}
          </p>
        {/if}

        <div class="fields">
          <label class="span">
            Select Credential
            <select bind:value={credential}>
              <option>cortex_memories (qdrant)</option>
              <option>knowledge_vectors (qdrant)</option>
              <option>doc_search (qdrant)</option>
            </select>
          </label>
          <label>
            Provider
            <input type="text" bind:value={provider} />
          </label>
          <label>
            Host
            <input type="text" bind:value={host} />
          </label>
          <label>
            Port
            <input type="text" bind:value={port} />
          </label>
          <label>
            Collection Name
            <input type="text" bind:value={collection} />
          </label>
        </div>
      </div>
    {:else}
      <div class="browse-body">
        <aside class="side">
          <div class="side-head">Collections ({collections.length})</div>
          <div class="side-list">
            {#each collections as c}
              <button
                class="coll"
                class:active={selected === c.name}
                type="button"
                on:click={() => selectCollection(c.name)}
              >
                <span class="coll-name">{c.name}</span>
                <span class="coll-count">{c.points.toLocaleString()} points</span>
              </button>
            {/each}
          </div>
          {#if !collections.length && browseError}
            <p class="faint small pad">{browseError}</p>
          {/if}
        </aside>

        <section class="main">
          {#if !selected}
            <p class="faint small">Select a collection to browse its points.</p>
          {:else}
            <div class="main-head">
              <h3>{selected}</h3>
              <div class="pager">
                <button class="pg" type="button" disabled={offsetStack.length <= 1} on:click={prevPage}>‹</button>
                <span class="pg-text">{PAGE} {pageStart}-{pageEnd}/{total.toLocaleString()}</span>
                <button class="pg" type="button" disabled={nextOffset === null || nextOffset === undefined} on:click={nextPage}>›</button>
              </div>
            </div>

            {#if loading}
              <p class="faint small">Loading…</p>
            {:else if browseError}
              <p class="faint small">{browseError}</p>
            {:else}
              <div class="points">
                {#each points as p}
                  <div class="point">
                    <div class="p-head">
                      <span class="p-id">ID: {formatId(p.id)}</span>
                      <span class="p-label">Payload</span>
                    </div>
                    <pre class="p-json">{@html pretty(p.payload ?? {})}</pre>
                  </div>
                {/each}
                {#if !points.length}
                  <p class="faint small">No points in this collection.</p>
                {/if}
              </div>
            {/if}
          {/if}
        </section>
      </div>
    {/if}

    <div class="modal-foot">
      <span class="saved">{savedFlash ? '✓ Saved' : `Last saved: ${lastSaved}`}</span>
      <button class="btn save" type="button" on:click={save}>
        <Icon name="gear" size={15} />
        Save
      </button>
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
    width: min(760px, 94vw);
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
  }
  .modal.wide { width: min(1120px, 97vw); }

  /* header bar — warm orange accent matching the reference */
  .modal-head {
    display: flex;
    align-items: center;
    gap: 14px;
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
  .head-tabs { display: flex; gap: 4px; }
  .htab {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    font-weight: 600;
    padding: 6px 14px;
    border: 1px solid transparent;
    border-radius: var(--r-sm);
    background: color-mix(in srgb, #f0a944 16%, var(--panel));
    color: var(--ink-dim);
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .htab:hover { color: var(--ink); }
  .htab.active {
    background: linear-gradient(135deg, #f0a944, #f7b955);
    color: #1a1406;
    font-weight: 700;
  }
  .head-icons { display: flex; align-items: center; gap: 4px; margin-left: auto; }
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

  .config-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 18px;
  }
  .config-head h3 { font-size: 17px; }
  .btn.test {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    font-weight: 600;
    padding: 8px 14px;
    border: 1px solid var(--signal-blue);
    color: var(--signal-blue);
    background: transparent;
    border-radius: var(--r-sm);
    cursor: pointer;
    transition: background 0.15s ease;
    white-space: nowrap;
  }
  .btn.test:hover { background: var(--signal-bg); }
  .btn.test:disabled { opacity: 0.6; cursor: default; }

  .test-result {
    font-family: var(--mono);
    font-size: 12px;
    margin: -8px 0 14px;
  }
  .test-result.ok { color: var(--good); }
  .test-result.fail { color: var(--danger); }

  .fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }
  .fields label.span { grid-column: 1 / -1; }
  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }
  input, select {
    width: 100%;
    background: var(--bg-alt);
    border: 1px solid var(--line);
    color: var(--ink);
    font-family: var(--body);
    font-size: 14px;
    padding: 10px 12px;
    border-radius: var(--r-sm);
    text-transform: none;
    letter-spacing: 0;
  }
  input:focus, select:focus { outline: none; border-color: var(--signal); }

  /* browse tab */
  .browse-body {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 220px 1fr;
  }
  .side {
    border-right: 1px solid var(--line-soft);
    padding: 14px 12px;
    overflow-y: auto;
    background: var(--bg-alt);
  }
  .side-head {
    font-family: var(--mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ink-faint);
    margin-bottom: 10px;
  }
  .side-list { display: flex; flex-direction: column; gap: 4px; }
  .coll {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    width: 100%;
    padding: 8px 10px;
    border: 1px solid transparent;
    border-radius: var(--r-sm);
    background: transparent;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .coll:hover { background: var(--panel-2); }
  .coll.active {
    border-color: color-mix(in srgb, var(--signal-blue) 45%, transparent);
    background: color-mix(in srgb, var(--signal-blue) 12%, transparent);
  }
  .coll-name { font-family: var(--mono); font-size: 12.5px; color: var(--ink); }
  .coll-count { font-family: var(--mono); font-size: 10.5px; color: var(--ink-faint); }
  .side .pad { padding: 8px 4px; }

  .main {
    padding: 14px 16px;
    overflow-y: auto;
    min-width: 0;
    background: var(--bg-deep);
  }
  .main-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }
  .main-head h3 { font-size: 15px; font-family: var(--mono); letter-spacing: 0; }
  .pager { display: flex; align-items: center; gap: 8px; }
  .pg {
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--line);
    border-radius: var(--r-sm);
    background: transparent;
    color: var(--ink-dim);
    cursor: pointer;
    font-size: 14px;
  }
  .pg:hover:not(:disabled) { color: var(--ink); border-color: var(--ink-faint); }
  .pg:disabled { opacity: 0.4; cursor: default; }
  .pg-text { font-family: var(--mono); font-size: 11px; color: var(--ink-faint); white-space: nowrap; }

  .points { display: flex; flex-direction: column; }
  .point {
    border: 1px solid var(--line-soft);
    border-radius: var(--r-sm);
    background: var(--panel);
    padding: 12px 14px;
    margin-bottom: 10px;
  }
  .p-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 6px;
  }
  .p-id { font-family: var(--mono); font-size: 12px; color: var(--ink); font-weight: 600; }
  .p-label {
    font-family: var(--mono);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ink-faint);
  }
  .p-json {
    font-family: var(--mono);
    font-size: 11.5px;
    line-height: 1.55;
    color: var(--ink-dim);
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }
  /* JSON syntax colors (matches reference: keys white, values teal/light blue) */
  .p-json :global(.j-key) { color: var(--ink); }
  .p-json :global(.j-str) { color: #7dd3c0; }
  .p-json :global(.j-num) { color: #7cc4ff; }
  .p-json :global(.j-bool) { color: #c4a7f0; }
  .p-json :global(.j-null) { color: #f0a944; }
  .p-json :global(.j-punct) { color: var(--ink-faint); }

  /* footer */
  .modal-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    border-top: 1px solid var(--line-soft);
    background: var(--panel-2);
  }
  .saved { font-family: var(--mono); font-size: 12px; color: var(--ink-faint); }
  .btn.save {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-weight: 700;
    padding: 9px 20px;
    border: none;
    border-radius: var(--r-sm);
    background: linear-gradient(135deg, #f0a944, #f7b955);
    color: #fff;
    cursor: pointer;
    transition: filter 0.15s ease;
  }
  .btn.save:hover { filter: brightness(1.08); }
  .btn.save :global(svg) { color: #fff; }

  @media (max-width: 640px) {
    .fields { grid-template-columns: 1fr; }
  }
</style>
