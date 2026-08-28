<script lang="ts">
  import { onMount } from 'svelte';

  let overview = { patterns: 0, memories: 0, agents: 0, executions: 0, knowledge: 0 };
  let memories: Array<{ id: string; agentSlug: string; category: string; content: string }> = [];
  let patterns: Array<{ id: string; name: string; description: string; tags: string[] }> = [];

  let memContent = '';
  let memCategory = 'note';
  let patName = '';
  let patDesc = '';
  let patTags = '';
  let message = '';
  let error = '';

  async function load() {
    try {
      const [ov, mr, pr] = await Promise.all([
        fetch('/api/cortex/overview').then((r) => r.json()),
        fetch('/api/cortex/memories').then((r) => r.json()),
        fetch('/api/cortex/patterns').then((r) => r.json()),
      ]);
      if (ov.ok) overview = ov;
      if (mr.ok) memories = mr.memories;
      if (pr.ok) patterns = pr.patterns;
    } catch {
      /* ignore */
    }
  }

  async function addMemory(e: Event) {
    e.preventDefault();
    error = '';
    message = '';
    if (!memContent.trim()) return;
    const r = await fetch('/api/cortex/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: memContent, category: memCategory }),
    });
    const d = await r.json();
    if (d.ok) {
      message = 'Memory stored';
      memContent = '';
      load();
    } else error = d.error ?? 'Failed';
  }

  async function addPattern(e: Event) {
    e.preventDefault();
    error = '';
    message = '';
    if (!patName.trim() || !patDesc.trim()) return;
    const r = await fetch('/api/cortex/patterns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: patName, description: patDesc, tags: patTags.split(',').map((t) => t.trim()).filter(Boolean) }),
    });
    const d = await r.json();
    if (d.ok) {
      message = `Pattern "${patName}" stored`;
      patName = '';
      patDesc = '';
      patTags = '';
      load();
    } else error = d.error ?? 'Failed';
  }

  onMount(load);
</script>

<div class="page-head">
  <div class="eyebrow">CORTEX — Memory System</div>
  <h1>The compounding brain.</h1>
  <p>Patterns, memories, and knowledge — synced across Mongo, Qdrant, and Neo4j.</p>
</div>

<div class="grid grid-4">
  <div class="card">
    <div class="faint mono small">PATTERNS</div>
    <div style="font-family:var(--display); font-size:32px; margin-top:8px;">{overview.patterns}</div>
  </div>
  <div class="card">
    <div class="faint mono small">MEMORIES</div>
    <div style="font-family:var(--display); font-size:32px; margin-top:8px;">{overview.memories}</div>
  </div>
  <div class="card">
    <div class="faint mono small">AGENTS</div>
    <div style="font-family:var(--display); font-size:32px; margin-top:8px;">{overview.agents}</div>
  </div>
  <div class="card">
    <div class="faint mono small">KNOWLEDGE DOCS</div>
    <div style="font-family:var(--display); font-size:32px; margin-top:8px;">{overview.knowledge}</div>
  </div>
</div>

{#if message}<p class="ok mt">{message}</p>{/if}
{#if error}<p class="error mt">{error}</p>{/if}

<div class="grid mt2" style="grid-template-columns: 1fr 1fr; align-items:start;">
  <div>
    <div class="eyebrow blue mb">Memories</div>
    <form class="card mb" on:submit={addMemory}>
      <label for="mcat">Category</label>
      <input class="input mb" id="mcat" bind:value={memCategory} placeholder="note / insight / profile" />
      <label for="mcontent">Memory</label>
      <textarea class="input mb" id="mcontent" rows="3" bind:value={memContent} placeholder="Remember this…"></textarea>
      <button class="btn solid" type="submit">Store memory</button>
    </form>
    <div class="panel" style="max-height:340px; overflow-y:auto;">
      {#each memories as m}
        <div style="padding:12px 16px; border-bottom:1px solid var(--line-soft);">
          <div class="mono small" style="color:var(--telemetry);">[{m.category}]</div>
          <p class="small mt" style="color:var(--ink-dim);">{m.content}</p>
        </div>
      {/each}
      {#if memories.length === 0}<div class="faint small" style="padding:16px;">No memories yet.</div>{/if}
    </div>
  </div>

  <div>
    <div class="eyebrow blue mb">Patterns</div>
    <form class="card mb" on:submit={addPattern}>
      <label for="pname">Name</label>
      <input class="input mb" id="pname" bind:value={patName} placeholder="e.g. SvelteKit CRUD API" />
      <label for="pdesc">Description</label>
      <textarea class="input mb" id="pdesc" rows="3" bind:value={patDesc} placeholder="A proven way to…"></textarea>
      <label for="ptags">Tags (comma-separated)</label>
      <input class="input mb" id="ptags" bind:value={patTags} placeholder="svelte, api, auth" />
      <button class="btn solid" type="submit">Store pattern</button>
    </form>
    <div class="panel" style="max-height:340px; overflow-y:auto;">
      {#each patterns as p}
        <div style="padding:12px 16px; border-bottom:1px solid var(--line-soft);">
          <div style="display:flex; justify-content:space-between; gap:8px;">
            <span class="mono" style="color:var(--ink);">{p.name}</span>
            {#if p.tags?.length}<span class="faint small">{p.tags.join(', ')}</span>{/if}
          </div>
          <p class="small mt" style="color:var(--ink-dim);">{p.description}</p>
        </div>
      {/each}
      {#if patterns.length === 0}<div class="faint small" style="padding:16px;">No patterns yet.</div>{/if}
    </div>
  </div>
</div>
