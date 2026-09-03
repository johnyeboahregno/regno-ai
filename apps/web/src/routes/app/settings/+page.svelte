<script lang="ts">
  import { onMount } from 'svelte';
  import { theme, type Theme } from '@regno/ui';

  type LlmKeyStatus = {
    name: 'OPENAI_API_KEY' | 'ANTHROPIC_API_KEY' | 'GOOGLE_AI_API_KEY' | 'DEEPSEEK_API_KEY';
    label: string;
    provider: string;
    configured: boolean;
    source: 'vault' | 'env' | 'none';
  };

  const themes: Array<{ id: Theme; name: string; desc: string; swatch: string[] }> = [
    { id: 'dark', name: 'Midnight', desc: 'Deep navy with a purple-blue signal.', swatch: ['#0a0c16', '#6c5ce7', '#8d7bff'] },
    { id: 'light', name: 'Daylight', desc: 'Clean light interface with a violet accent.', swatch: ['#f3f5fa', '#5b4be0', '#7b6bff'] },
    { id: 'tactical', name: 'Tactical', desc: 'Near-black HUD with orange & green status accents.', swatch: ['#070907', '#ff9d2e', '#3ddc84'] },
    { id: 'aurora', name: 'Aurora', desc: 'Deep blue productivity HUD with glowing blue & purple accents.', swatch: ['#0a0e1a', '#4f8dff', '#8d7bff'] },
    { id: 'nova', name: 'Nova', desc: 'Black & gold with a premium, knightly feel.', swatch: ['#0a0906', '#e3b84a', '#f2d47e'] },
    { id: 'emerald', name: 'Emerald', desc: 'Dark olive green with gold, mystical tarot feel.', swatch: ['#0c120b', '#d4af37', '#b8d48a'] },
    { id: 'matrix', name: 'Matrix', desc: 'Black & phosphor green, terminal aesthetic.', swatch: ['#010502', '#00ff66', '#22ff88'] },
  ];

  function apply(id: Theme) {
    theme.set(id);
  }

  let llmKeys: LlmKeyStatus[] = [];
  let keyInputs: Partial<Record<LlmKeyStatus['name'], string>> = {};
  let keyLoading = true;
  let keySaving = false;
  let keyMessage = '';
  let keyError = '';
  let restartLoading = false;
  let restartMessage = '';
  let restartError = '';

  async function loadLlmKeys() {
    keyLoading = true;
    keyError = '';
    try {
      const res = await fetch('/api/settings/llm-keys');
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Could not load LLM API keys');
      llmKeys = json.keys;
    } catch (err) {
      keyError = (err as Error).message;
    } finally {
      keyLoading = false;
    }
  }

  async function saveLlmKeys() {
    keySaving = true;
    keyMessage = '';
    keyError = '';
    restartMessage = '';
    restartError = '';
    const keys = Object.fromEntries(
      Object.entries(keyInputs).filter(([, value]) => value !== undefined),
    ) as Partial<Record<LlmKeyStatus['name'], string>>;

    try {
      const res = await fetch('/api/settings/llm-keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Could not save LLM API keys');
      llmKeys = json.keys;
      keyInputs = {};
      keyMessage = 'LLM API keys saved.';
    } catch (err) {
      keyError = (err as Error).message;
    } finally {
      keySaving = false;
    }
  }

  async function restartExecution() {
    restartLoading = true;
    restartMessage = '';
    restartError = '';
    try {
      const res = await fetch('/api/settings/execution/restart', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Could not restart execution');
      restartMessage = 'Execution restarted. New jobs will use the saved keys.';
    } catch (err) {
      restartError = (err as Error).message;
    } finally {
      restartLoading = false;
    }
  }

  onMount(loadLlmKeys);
</script>

<svelte:head><title>Settings — Regno AI</title></svelte:head>

<div class="page-head">
  <div class="eyebrow blue">Settings</div>
  <h1>Preferences</h1>
  <p>Personalise how the platform looks. Changes apply instantly and are remembered on this device.</p>
</div>

<div class="field-label">Theme</div>
<div class="theme-grid">
  {#each themes as t}
    <button class="theme-card" class:active={$theme === t.id} on:click={() => apply(t.id)} aria-pressed={$theme === t.id}>
      <span class="swatch">
        {#each t.swatch as c}<i style="background:{c};"></i>{/each}
      </span>
      <span class="t-name">{t.name}</span>
      <span class="t-desc">{t.desc}</span>
    </button>
  {/each}
</div>

<section class="settings-section">
  <div class="section-headline">
    <div>
      <div class="field-label">LLM API Keys</div>
      <h2>Provider access</h2>
      <p>Set keys after install. Values are encrypted in the credential vault and never echoed back.</p>
    </div>
    <button class="refresh-btn" type="button" on:click={loadLlmKeys} disabled={keyLoading || keySaving}>Refresh</button>
  </div>

  {#if keyError}<div class="status error">{keyError}</div>{/if}
  {#if keyMessage}<div class="status success">{keyMessage}</div>{/if}
  {#if restartError}<div class="status error">{restartError}</div>{/if}
  {#if restartMessage}<div class="status success">{restartMessage}</div>{/if}

  <div class="key-grid" aria-busy={keyLoading || keySaving}>
    {#if keyLoading}
      <div class="empty-state">Loading provider key status...</div>
    {:else}
      {#each llmKeys as key}
        <label class="key-card">
          <span class="key-row">
            <span>
              <span class="key-name">{key.label}</span>
              <span class="key-env">{key.name}</span>
            </span>
            <span class="key-pill" class:ready={key.configured}>{key.configured ? `Set via ${key.source}` : 'Missing'}</span>
          </span>
          <input
            type="password"
            autocomplete="off"
            placeholder={key.configured ? 'Leave blank to keep current key' : 'Paste API key'}
            value={keyInputs[key.name] ?? ''}
            on:input={(event) => (keyInputs = { ...keyInputs, [key.name]: event.currentTarget.value })}
          />
        </label>
      {/each}
    {/if}
  </div>

  <div class="key-actions">
    <button class="restart-btn" type="button" on:click={restartExecution} disabled={keyLoading || keySaving || restartLoading}>
      {restartLoading ? 'Restarting...' : 'Restart execution'}
    </button>
    <button class="save-btn" type="button" on:click={saveLlmKeys} disabled={keyLoading || keySaving}>
      {keySaving ? 'Saving...' : 'Save LLM keys'}
    </button>
  </div>
</section>

<style>
  .field-label {
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--ink-faint);
    margin: 8px 0 14px;
  }
  .theme-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
    max-width: 760px;
  }
  .theme-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-align: left;
    padding: 14px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--r);
    cursor: pointer;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .theme-card:hover { border-color: var(--ink-faint); }
  .theme-card.active { border-color: var(--signal); box-shadow: 0 0 0 1px var(--signal); }
  .swatch {
    display: flex;
    height: 52px;
    border: 1px solid var(--line-soft);
    border-radius: 6px;
    overflow: hidden;
  }
  .swatch i { flex: 1; }
  .t-name { font-family: var(--display); font-size: 15px; font-weight: 600; color: var(--ink); }
  .t-desc { font-size: 12.5px; color: var(--ink-dim); }
  .settings-section {
    max-width: 860px;
    margin-top: 34px;
    padding-top: 28px;
    border-top: 1px solid var(--line);
  }
  .section-headline {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 18px;
    margin-bottom: 16px;
  }
  .section-headline h2 {
    margin: 0 0 6px;
    font-family: var(--display);
    font-size: 22px;
    color: var(--ink);
  }
  .section-headline p {
    max-width: 620px;
    margin: 0;
    color: var(--ink-dim);
    font-size: 13px;
    line-height: 1.5;
  }
  .refresh-btn,
  .restart-btn,
  .save-btn {
    border: 1px solid var(--line);
    border-radius: var(--r);
    background: var(--panel);
    color: var(--ink);
    padding: 10px 14px;
    font: inherit;
    cursor: pointer;
  }
  .refresh-btn:disabled,
  .restart-btn:disabled,
  .save-btn:disabled { opacity: 0.55; cursor: wait; }
  .key-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 14px;
  }
  .key-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--r);
  }
  .key-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }
  .key-name,
  .key-env { display: block; }
  .key-name { font-family: var(--display); font-weight: 650; color: var(--ink); }
  .key-env { margin-top: 4px; font-family: var(--mono); font-size: 11px; color: var(--ink-faint); }
  .key-pill {
    flex: 0 0 auto;
    border: 1px solid var(--line-soft);
    border-radius: 999px;
    padding: 4px 8px;
    color: var(--ink-faint);
    font-family: var(--mono);
    font-size: 10px;
    text-transform: uppercase;
  }
  .key-pill.ready { border-color: color-mix(in srgb, var(--ok) 55%, var(--line)); color: var(--ok); }
  .key-card input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    background: color-mix(in srgb, var(--panel) 78%, #000 22%);
    color: var(--ink);
    padding: 11px 12px;
    font: inherit;
  }
  .key-actions { margin-top: 16px; display: flex; justify-content: flex-end; gap: 10px; }
  .restart-btn { background: transparent; }
  .save-btn { background: var(--signal); border-color: var(--signal); color: var(--signal-ink); font-weight: 700; }
  .status {
    margin: 0 0 14px;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 13px;
  }
  .status.error { border: 1px solid color-mix(in srgb, var(--danger) 50%, var(--line)); color: var(--danger); }
  .status.success { border: 1px solid color-mix(in srgb, var(--ok) 50%, var(--line)); color: var(--ok); }
  .empty-state {
    grid-column: 1 / -1;
    padding: 16px;
    border: 1px dashed var(--line);
    border-radius: var(--r);
    color: var(--ink-dim);
  }
  @media (max-width: 640px) {
    .section-headline { flex-direction: column; }
    .refresh-btn,
    .restart-btn,
    .save-btn { width: 100%; }
    .key-actions { flex-direction: column; }
  }
</style>
