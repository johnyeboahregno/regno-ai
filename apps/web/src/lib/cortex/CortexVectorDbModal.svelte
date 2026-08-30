<script lang="ts">
  // Vector DB configuration modal for the CORTEX Architecture tab — opened from the
  // Vector DB node. Mirrors the reference "Vector Db" panel: a Configure tab with the
  // Qdrant connection form (+ Test Connection), a Browse tab listing collections, and a
  // footer with Last saved + Save.
  import { onMount, onDestroy } from 'svelte';
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

  const collections = [
    'cortex_patterns',
    'cortex_wisdom',
    'cortex_execution_memories',
    'knowledge_vectors',
    'doc_search',
  ];

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }
  onMount(() => window.addEventListener('keydown', onKey));
  onDestroy(() => window.removeEventListener('keydown', onKey));

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
          on:click={() => (tab = 'browse')}
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
      <div class="modal-body">
        <div class="config-head">
          <h3>Collections</h3>
        </div>
        <div class="browse">
          {#each collections as c}
            <div class="row">
              <span class="row-name">{c}</span>
              <span class="row-count">— vectors</span>
            </div>
          {/each}
        </div>
        <p class="faint small">Start the stack to load live vector counts.</p>
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
    width: min(600px, 94vw);
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
  }
  .modal.wide { width: min(820px, 97vw); }

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
  .browse { display: flex; flex-direction: column; }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid var(--line-soft);
    border-radius: var(--r-sm);
    background: var(--panel);
    margin-bottom: 10px;
  }
  .row-name { font-family: var(--mono); font-size: 13px; color: var(--ink); }
  .row-count { font-family: var(--mono); font-size: 11px; color: var(--ink-faint); }

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
