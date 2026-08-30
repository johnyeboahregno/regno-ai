<script lang="ts">
  import { onMount } from 'svelte';
  import PasswordInput from '$lib/PasswordInput.svelte';

  interface Tech { slug: string; label: string; icon: string }
  interface Agent {
    slug: string; name: string; technologies: string[]; namespace: string; port: number; status: string; createdAt: string;
  }

  let step = 0;
  let name = '';
  let description = '';
  let disciplines: Tech[] = [];
  let languages: Tech[] = [];
  let selectedDisciplines: string[] = [];
  let selectedLanguages: string[] = [];
  let reposText = '';
  let githubToken = '';
  let testingToken = false;
  let tokenResult = '';
  let datasourceType = '';
  let datasourceConn = '';
  let busy = false;
  let error = '';
  let message = '';
  let agents: Agent[] = [];
  let origin = '';
  let deleting = '';

  async function load() {
    try {
      const [tr, ar] = await Promise.all([
        fetch('/api/technologies').then((r) => r.json()),
        fetch('/api/agents').then((r) => r.json()),
      ]);
      if (tr.ok) {
        disciplines = tr.disciplines ?? [];
        languages = tr.languages ?? [];
      }
      if (ar.ok) agents = ar.agents;
    } catch {
      /* ignore */
    }
  }

  function toggleDiscipline(slug: string) {
    selectedDisciplines = selectedDisciplines.includes(slug)
      ? selectedDisciplines.filter((s) => s !== slug)
      : [...selectedDisciplines, slug];
  }

  function toggleLanguage(slug: string) {
    selectedLanguages = selectedLanguages.includes(slug)
      ? selectedLanguages.filter((s) => s !== slug)
      : [...selectedLanguages, slug];
  }

  async function testToken() {
    if (!githubToken.trim()) return;
    testingToken = true;
    tokenResult = '';
    const repos = reposText.split('\n').map((r) => r.trim()).filter(Boolean);
    try {
      const r = await fetch('/api/github/test-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: githubToken, repos }),
      });
      const d = await r.json();
      if (d.ok) {
        const who = d.user?.login ? `${d.user.login}${d.user.name ? ` (${d.user.name})` : ''}` : 'valid token';
        const parts = [`Token OK — ${who}`];
        if (d.repos?.length) {
          const bad = d.repos.filter((x: { accessible: boolean }) => !x.accessible);
          if (bad.length) parts.push(`No access to: ${bad.map((x: { repo: string }) => x.repo).join(', ')}`);
          else parts.push(`Read access to all ${d.repos.length} repo(s) ✓`);
        }
        tokenResult = parts.join(' · ');
      } else {
        tokenResult = d.error ?? 'Token test failed';
      }
    } catch {
      tokenResult = 'Token test failed';
    } finally {
      testingToken = false;
    }
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
        body: JSON.stringify({
          name,
          disciplines: selectedDisciplines,
          languages: selectedLanguages,
          technologies: [...selectedDisciplines, ...selectedLanguages],
          repos,
          datasources,
          githubToken,
        }),
      });
      const d = await r.json();
      if (d.ok) {
        message = `Agent "${d.name}" is spawning in namespace ${d.namespace} (web on :${d.port})`;
        name = ''; description = ''; selectedDisciplines = []; selectedLanguages = []; reposText = ''; githubToken = ''; tokenResult = ''; datasourceType = ''; datasourceConn = ''; step = 0;
        load();
      } else error = d.error ?? 'Failed';
    } catch {
      error = 'Failed to create agent';
    } finally {
      busy = false;
    }
  }

  async function remove(a: Agent) {
    if (!confirm(`Delete architect "${a.name}" (${a.namespace})? This removes its brain, memories, credentials and k3s namespace.`)) return;
    deleting = a.slug;
    error = '';
    message = '';
    try {
      const r = await fetch(`/api/agents/${encodeURIComponent(a.slug)}`, { method: 'DELETE' });
      const d = await r.json();
      if (d.ok) {
        message = `Deleted "${a.name}".`;
        load();
      } else {
        error = d.error ?? 'Failed to delete';
      }
    } catch {
      error = 'Failed to delete agent';
    } finally {
      deleting = '';
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
    <div class="eyebrow blue mb">Step 2 · Disciplines &amp; Languages</div>
    <p class="muted small mb">Select one or more — the agent will follow the best-practice standards for each.</p>

    <div class="eyebrow blue mb" style="font-size:11px; letter-spacing:0.06em;">Disciplines</div>
    <div class="grid grid-2">
      {#each disciplines as t}
        <button class="tile" class:on={selectedDisciplines.includes(t.slug)} on:click={() => toggleDiscipline(t.slug)} style="display:flex; align-items:center; gap:10px; padding:14px 16px; background:var(--panel); border:1px solid var(--line); border-radius:10px; cursor:pointer; text-align:left;">
          <span style="font-size:20px;">{t.icon}</span>
          <span class="mono small" style="color:var(--ink);">{t.label}</span>
          {#if selectedDisciplines.includes(t.slug)}<span style="margin-left:auto; color:var(--good);">✓</span>{/if}
        </button>
      {/each}
    </div>

    <div class="eyebrow blue mb mt" style="font-size:11px; letter-spacing:0.06em;">Languages</div>
    <div class="grid grid-2">
      {#each languages as t}
        <button class="tile" class:on={selectedLanguages.includes(t.slug)} on:click={() => toggleLanguage(t.slug)} style="display:flex; align-items:center; gap:10px; padding:14px 16px; background:var(--panel); border:1px solid var(--line); border-radius:10px; cursor:pointer; text-align:left;">
          <span style="font-size:20px;">{t.icon}</span>
          <span class="mono small" style="color:var(--ink);">{t.label}</span>
          {#if selectedLanguages.includes(t.slug)}<span style="margin-left:auto; color:var(--good);">✓</span>{/if}
        </button>
      {/each}
    </div>

    <div class="mt" style="display:flex; gap:12px;">
      <button class="btn ghost" on:click={() => (step = 1)}>Back</button>
      <button class="btn solid" on:click={() => (step = 3)} disabled={!selectedDisciplines.length && !selectedLanguages.length}>Next</button>
    </div>
  </div>
{:else if step === 3}
  <div class="card mb">
    <div class="eyebrow blue mb">Step 3 · Repos (optional)</div>
    <label for="repos">GitHub repos to learn from (one per line)</label>
    <textarea class="input mb" id="repos" rows="4" bind:value={reposText} placeholder="owner/repo&#10;owner/other-repo"></textarea>
    <label for="ghToken">GitHub token (optional — needed for private repos)</label>
    <PasswordInput bind:value={githubToken} id="ghToken" label="GitHub token" autocomplete="new-password" required={false} />
    <p class="muted small mt">Leave blank to use the global <span class="mono">GITHUB_TOKEN</span> (if configured).</p>
    <div class="mt" style="display:flex; align-items:center; gap:12px;">
      <button class="btn ghost" on:click={testToken} disabled={testingToken || !githubToken.trim()}>{testingToken ? 'Testing…' : 'Test token'}</button>
      {#if tokenResult}<span class="small muted">{tokenResult}</span>{/if}
    </div>
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
            <div style="display:flex; gap:8px; align-items:center; justify-content:flex-end;">
              {#if a.status === 'ready' && a.port}
                <a href="{origin}:{a.port}" target="_blank" class="btn solid" style="padding:6px 12px;">Open →</a>
              {/if}
              <button class="btn ghost" on:click={() => remove(a)} disabled={deleting === a.slug} style="padding:6px 12px;">
                {deleting === a.slug ? 'Deleting…' : 'Delete'}
              </button>
            </div>
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
