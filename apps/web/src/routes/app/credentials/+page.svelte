<script lang="ts">
  import { onMount } from 'svelte';

  let items: Array<{ id: string; name: string; type: string; provider: string }> = [];
  let name = '';
  let type = 'api';
  let provider = '';
  let secret = '';
  let error = '';
  let message = '';

  async function load() {
    try {
      const r = await fetch('/api/credentials');
      const d = await r.json();
      if (d.ok) items = d.credentials;
      else error = d.error;
    } catch {
      error = 'Failed to load credentials';
    }
  }

  async function add(e: Event) {
    e.preventDefault();
    error = '';
    message = '';
    const r = await fetch('/api/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, provider, secret }),
    });
    const d = await r.json();
    if (d.ok) {
      message = `Stored "${name}"`;
      name = '';
      secret = '';
      provider = '';
      load();
    } else {
      error = d.error ?? 'Failed to store';
    }
  }

  async function remove(id: string, label: string) {
    await fetch(`/api/credentials/${id}`, { method: 'DELETE' });
    message = `Removed "${label}"`;
    load();
  }

  onMount(load);
</script>

<div class="page-head">
  <div class="eyebrow blue">Vault</div>
  <h1>Credentials</h1>
  <p>Service credentials, AES-256-GCM encrypted at rest.</p>
</div>

<div class="card mb">
  <form on:submit={add}>
    <div class="grid grid-3">
      <div>
        <label for="cname">Name</label>
        <input class="input" id="cname" bind:value={name} required />
      </div>
      <div>
        <label for="ctype">Type</label>
        <input class="input" id="ctype" bind:value={type} placeholder="api" />
      </div>
      <div>
        <label for="cprov">Provider</label>
        <input class="input" id="cprov" bind:value={provider} placeholder="optional" />
      </div>
    </div>
    <div class="mt">
      <label for="csecret">Secret</label>
      <input class="input" id="csecret" type="password" bind:value={secret} required />
    </div>
    <button class="btn solid mt" type="submit">Store credential</button>
  </form>
  {#if message}<p class="ok mt">{message}</p>{/if}
  {#if error}<p class="error mt">{error}</p>{/if}
</div>

<div class="panel" style="overflow-x:auto;">
  <table>
    <thead>
      <tr><th>Name</th><th>Type</th><th>Provider</th><th></th></tr>
    </thead>
    <tbody>
      {#each items as c}
        <tr>
          <td class="mono">{c.name}</td>
          <td class="mono">{c.type}</td>
          <td class="muted">{c.provider}</td>
          <td><button class="btn ghost" on:click={() => remove(c.id, c.name)} style="padding:6px 12px;">Remove</button></td>
        </tr>
      {/each}
      {#if items.length === 0}
        <tr><td colspan="4" class="faint">No credentials stored yet.</td></tr>
      {/if}
    </tbody>
  </table>
</div>
