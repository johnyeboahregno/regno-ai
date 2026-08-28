<script lang="ts">
  import { onMount } from 'svelte';

  interface Tech { slug: string; label: string; icon: string }
  interface Agent {
    slug: string; name: string; technologies: string[]; namespace: string; port: number; status: string; createdAt: string;
  }

  let step = 0;
  let name = '';
  let description = '';
  let technologies: Tech[] = [];
  let selected: string[] = [];
  let reposText = '';
  let datasourceType = '';
  let datasourceConn = '';
  let busy = false;
  let error = '';
  let message = '';
  let agents: Agent[] = [];
  let origin = '';

  async function load() {
    try {
      const [tr, ar] = await Promise.all([
        fetch('/api/technologies').then((r) => r.json()),
        fetch('/api/agents').then((r) => r.json()),
      ]);
      if (tr.ok) technologies = tr.technologies;
      if (ar.ok) agents = ar.agents;
    } catch {
      /* ignore */
    }
  }

  function toggle(slug: string) {
    selected = selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug];
  }

  async function create() {
    busy = true;
    error = '';
    message = '';
    const datasources = datasourceType && datasourceConn ? [{ type: datasourceType, connection: datasourceConn }] : [];
    const repos = reposText.split('\n').map((r) => r.trim()).filter(Boolean);
    try {
      const r = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, technologies: selected, repos, datasources }),
      });
      const d = await r.json();
      if (d.ok) {
        message = `Agent "${d.name}" is spawning in namespace ${d.namespace} (web on :${d.port})`;
        name = ''; description = ''; selected = []; reposText = ''; datasourceType = ''; datasourceConn = ''; step = 0;
        load();
      } else error = d.error ?? 'Failed';
    } catch {
      error = 'Failed to create agent';
    } finally {
      busy = false;
    }
  }

  onMount(() => {
    origin = window.location.protocol + '//' + window.location.hostname;
    load();
  });
</script>

<div class="page-head">
  <div class="eyebrow blue">Admin · Regno Architects</div>
  <h1>Regno Architects</h1>
  <p>Each architect is a <strong>complete new stack with its own brain</strong> — its own context, docs, and knowledge — that can also read the shared base knowledge.</p>
</div>

{#if message}<p class="ok mb">{message}</p>{/if}
{#if error}<p class="error mb">{error}</p>{/if}

<div class="card mb" style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
  <div>
    <div class="eyebrow blue">Create a new stack</div>
    <p class="muted small mt">Provisions a fresh namespace with the full platform + its own brain.</p>
  </div>
  <button class="btn solid" on:click={() => (step = 1)}>Create new Architect</button>
</div>

{#if step === 1}
  <div class="card mb">
    <div class="eyebrow blue mb">Step 1 · Name it</div>
    <label for="aname">Agent name</label>
    <input class="input mb" id="aname" bind:value={name} placeholder="e.g. Go API Developer" />
    <label for="adesc">Description</label>
    <textarea class="input mb" id="adesc" rows="2" bind:value={description} placeholder="What does this architect specialise in?"></textarea>
    <button class="btn solid" on:click={() => (step = 2)} disabled={!name.trim()}>Next</button>
  </div>
{:else if step === 2}
  <div class="card mb">
    <div class="eyebrow blue mb">Step 2 · Technologies</div>
    <p class="muted small mb">Select one or more — the agent will follow the best-practice standards for each.</p>
    <div class="grid grid-2">
      {#each technologies as t}
        <button class="tile" class:on={selected.includes(t.slug)} on:click={() => toggle(t.slug)} style="display:flex; align-items:center; gap:10px; padding:14px 16px; background:var(--panel); border:1px solid var(--line); border-radius:10px; cursor:pointer; text-align:left;">
          <span style="font-size:20px;">{t.icon}</span>
          <span class="mono small" style="color:var(--ink);">{t.label}</span>
          {#if selected.includes(t.slug)}<span style="margin-left:auto; color:var(--good);">✓</span>{/if}
        </button>
      {/each}
    </div>
    <div class="mt" style="display:flex; gap:12px;">
      <button class="btn ghost" on:click={() => (step = 1)}>Back</button>
      <button class="btn solid" on:click={() => (step = 3)} disabled={!selected.length}>Next</button>
    </div>
  </div>
{:else if step === 3}
  <div class="card mb">
    <div class="eyebrow blue mb">Step 3 · Repos (optional)</div>
    <label for="repos">GitHub repos to learn from (one per line)</label>
    <textarea class="input mb" id="repos" rows="4" bind:value={reposText} placeholder="owner/repo&#10;owner/other-repo"></textarea>
    <div class="mt" style="display:flex; gap:12px;">
      <button class="btn ghost" on:click={() => (step = 2)}>Back</button>
      <button class="btn solid" on:click={() => (step = 4)}>Next</button>
    </div>
  </div>
{:else}
  <div class="card mb">
    <div class="eyebrow blue mb">Step 4 · Data source (optional)</div>
    <label for="dstype">Type</label>
    <input class="input mb" id="dstype" bind:value={datasourceType} placeholder="postgres / mongo / …" />
    <label for="dsconn">Connection string</label>
    <input class="input mb" id="dsconn" bind:value={datasourceConn} placeholder="(stored encrypted in the credentials vault)" />
    <div class="mt" style="display:flex; gap:12px;">
      <button class="btn ghost" on:click={() => (step = 3)}>Back</button>
      <button class="btn solid" on:click={create} disabled={busy}>{busy ? 'Creating…' : 'Create agent'}</button>
    </div>
  </div>
{/if}

<div class="eyebrow blue mb mt2">Agents</div>
<div class="panel" style="overflow-x:auto;">
  <table>
    <thead><tr><th>Name</th><th>Technologies</th><th>Namespace</th><th>Port</th><th>Status</th><th></th></tr></thead>
    <tbody>
      {#each agents as a}
        <tr>
          <td class="mono">{a.name}</td>
          <td>{a.technologies?.join(', ') || '—'}</td>
          <td class="mono">{a.namespace}</td>
          <td>{a.port ?? '—'}</td>
          <td><span class="tag" class:signal={a.status === 'ready'}>{a.status}</span></td>
          <td>
            {#if a.status === 'ready' && a.port}
              <a href="{origin}:{a.port}" target="_blank" class="btn solid" style="padding:6px 12px;">Open →</a>
            {:else}
              <span class="faint small">…</span>
            {/if}
          </td>
        </tr>
      {/each}
      {#if agents.length === 0}
        <tr><td colspan="6" class="faint">No architects yet — create your first one above.</td></tr>
      {/if}
    </tbody>
  </table>
</div>

<style>
  .tile.on { border-color: var(--signal); background: rgba(91,110,245,0.08); }
  .tag.signal { color: var(--good); border-color: var(--good); }
</style>
