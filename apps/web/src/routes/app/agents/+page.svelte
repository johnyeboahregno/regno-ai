<script lang="ts">
  import { onMount } from 'svelte';

  interface Tech { slug: string; label: string; icon: string }
  interface Sma {
    slug: string; name: string; description: string; focusTags: string[]; technologies: string[]; disciplines: string[]; languages: string[]; createdAt: string | null;
  }

  let step = 0;
  let editingSlug = '';
  let name = '';
  let description = '';
  let focusTagsText = '';
  let disciplines: Tech[] = [];
  let languages: Tech[] = [];
  let selectedDisciplines: string[] = [];
  let selectedLanguages: string[] = [];
  let busy = false;
  let error = '';
  let message = '';
  let smas: Sma[] = [];
  let deleting = '';

  $: editing = !!editingSlug;

  async function load() {
    try {
      const [tr, sr] = await Promise.all([
        fetch('/api/technologies').then((r) => r.json()),
        fetch('/api/agents').then((r) => r.json()),
      ]);
      if (tr.ok) {
        disciplines = tr.disciplines ?? [];
        languages = tr.languages ?? [];
      }
      if (sr.ok) smas = sr.smas;
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

  async function create() {
    busy = true;
    error = '';
    message = '';
    const focusTags = focusTagsText.split(',').map((t) => t.trim()).filter(Boolean);
    try {
      const r = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          focusTags,
          disciplines: selectedDisciplines,
          languages: selectedLanguages,
          technologies: [...selectedDisciplines, ...selectedLanguages],
        }),
      });
      const d = await r.json();
      if (d.ok) {
        message = `SMA "${d.name}" created. Select it from the Architect screen when running a job.`;
        name = ''; description = ''; focusTagsText = ''; selectedDisciplines = []; selectedLanguages = []; step = 0;
        load();
      } else error = d.error ?? 'Failed';
    } catch {
      error = 'Failed to create SMA';
    } finally {
      busy = false;
    }
  }

  function resetForm() {
    name = '';
    description = '';
    focusTagsText = '';
    selectedDisciplines = [];
    selectedLanguages = [];
    editingSlug = '';
    step = 0;
  }

  function startCreate() {
    resetForm();
    step = 1;
  }

  function startEdit(s: Sma) {
    error = '';
    message = '';
    editingSlug = s.slug;
    name = s.name;
    description = s.description ?? '';
    focusTagsText = (s.focusTags ?? []).join(', ');
    selectedDisciplines = s.disciplines ?? [];
    selectedLanguages = s.languages ?? [];
    step = 1;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function update() {
    if (!editingSlug) return;
    busy = true;
    error = '';
    message = '';
    const focusTags = focusTagsText.split(',').map((t) => t.trim()).filter(Boolean);
    try {
      const r = await fetch(`/api/agents/${encodeURIComponent(editingSlug)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          focusTags,
          disciplines: selectedDisciplines,
          languages: selectedLanguages,
          technologies: [...selectedDisciplines, ...selectedLanguages],
        }),
      });
      const d = await r.json();
      if (d.ok) {
        message = `SMA "${d.name}" updated.`;
        resetForm();
        load();
      } else error = d.error ?? 'Failed';
    } catch {
      error = 'Failed to update SMA';
    } finally {
      busy = false;
    }
  }

  async function remove(s: Sma) {
    if (!window.confirm(`Delete SMA "${s.name}"?`)) return;
    deleting = s.slug;
    error = '';
    message = '';
    try {
      const r = await fetch(`/api/agents/${encodeURIComponent(s.slug)}`, { method: 'DELETE' });
      const d = await r.json();
      if (d.ok) {
        message = `Deleted "${s.name}".`;
        load();
      } else {
        error = d.error ?? 'Failed to delete';
      }
    } catch {
      error = 'Failed to delete SMA';
    } finally {
      deleting = '';
    }
  }

  onMount(() => {
    load();
  });
</script>

<div class="page-head">
  <div class="eyebrow blue">Admin · Subject Matter Experts</div>
  <h1>Subject Matter Experts (SMA)</h1>
  <p>One architect, many lenses. An <strong>SMA</strong> is a selectable expert profile for architect jobs — focused on a specific area (e.g. an F1 Race Engineer centered on F1, telemetry and aero). It is <strong>not</strong> a new stack.</p>
</div>

{#if message}<p class="ok mb">{message}</p>{/if}
{#if error}<p class="error mb">{error}</p>{/if}

<div class="card mb" style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
  <div>
    <div class="eyebrow blue">{editing ? 'Edit SMA' : 'Create an SMA'}</div>
    <p class="muted small mt">{editing ? 'Update the active expert profile.' : 'A profile you can select when running an architect job.'}</p>
  </div>
  <button class="btn solid" on:click={startCreate}>{editing ? 'Cancel edit' : 'Create SMA'}</button>
</div>

{#if step === 1}
  <div class="card mb">
    <div class="eyebrow blue mb">Step 1 · {editing ? 'Edit name &amp; focus' : 'Name &amp; focus'}</div>
    <label for="aname">Name</label>
    <input class="input mb" id="aname" bind:value={name} placeholder="e.g. F1 Race Engineer" />
    <label for="adesc">Description</label>
    <textarea class="input mb" id="adesc" rows="2" bind:value={description} placeholder="What does this SMA specialise in?"></textarea>
    <label for="atags">Focus tags (comma-separated)</label>
    <input class="input mb" id="atags" bind:value={focusTagsText} placeholder="F1, telemetry, aerodynamics" />
    <p class="muted small mb">Knowledge tagged with these areas is centered when this SMA runs a job — all knowledge stays reachable.</p>
    <button class="btn solid" on:click={() => (step = 2)} disabled={!name.trim()}>Next</button>
  </div>
{:else if step === 2}
  <div class="card mb">
    <div class="eyebrow blue mb">Step 2 · Disciplines &amp; Languages (optional)</div>
    <p class="muted small mb">Select one or more — the SMA will follow the best-practice standards for each.</p>

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
      <button class="btn solid" on:click={editing ? update : create} disabled={busy}>{busy ? (editing ? 'Saving…' : 'Creating…') : (editing ? 'Save changes' : 'Create SMA')}</button>
    </div>
  </div>
{/if}

<div class="eyebrow blue mb mt2">Subject Matter Experts</div>
<div class="panel" style="overflow-x:auto;">
  <table>
    <thead><tr><th>Name</th><th>Focus</th><th>Technologies</th><th></th></tr></thead>
    <tbody>
      {#each smas as s}
        <tr>
          <td class="mono">{s.name}</td>
          <td>{s.focusTags?.join(', ') || '—'}</td>
          <td>{s.technologies?.join(', ') || '—'}</td>
          <td>
            {#if s.slug !== 'base'}
              <button class="btn ghost" on:click={() => startEdit(s)} disabled={deleting === s.slug} style="padding:6px 12px; margin-right:8px;">
                Edit
              </button>
              <button class="btn ghost" on:click={() => remove(s)} disabled={deleting === s.slug} style="padding:6px 12px;">
                {deleting === s.slug ? 'Deleting…' : 'Delete'}
              </button>
            {/if}
          </td>
        </tr>
      {/each}
      {#if smas.length === 0}
        <tr><td colspan="4" class="faint">No SMAs yet — create your first one above.</td></tr>
      {/if}
    </tbody>
  </table>
</div>

<style>
  .tile.on { border-color: var(--signal); background: rgba(91,110,245,0.08); }
</style>
