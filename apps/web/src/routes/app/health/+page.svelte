<script lang="ts">
  import { onMount } from 'svelte';

  let health = {
    redis: false,
    mongo: false,
    qdrant: false,
    neo4j: false,
    smtp: { host: '', port: 587, from: '', configured: false },
  };
  let loaded = false;
  let emailTo = '';
  let mailMessage = '';
  let mailError = '';
  let busy = false;

  async function load() {
    try {
      const r = await fetch('/api/health');
      const d = await r.json();
      if (d.ok) health = d;
    } catch {
      /* ignore */
    }
    loaded = true;
  }

  async function sendTest(e: Event) {
    e.preventDefault();
    busy = true;
    mailError = '';
    mailMessage = '';
    const r = await fetch('/api/test/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: emailTo }),
    });
    const d = await r.json();
    busy = false;
    if (d.ok) mailMessage = 'Test email queued for delivery';
    else mailError = d.error ?? 'Failed to send';
  }

  onMount(load);
</script>

<div class="page-head">
  <div class="eyebrow good">Health</div>
  <h1>System status</h1>
  <p>Databases, queues, and email connectivity.</p>
</div>

<div class="grid grid-4">
  <div class="card">
    <span class="status"><span class="dot" class:good={health.mongo} class:bad={!health.mongo}></span>MongoDB</span>
    <p class="faint small mt">document store</p>
  </div>
  <div class="card">
    <span class="status"><span class="dot" class:good={health.qdrant} class:bad={!health.qdrant}></span>Qdrant</span>
    <p class="faint small mt">vector store</p>
  </div>
  <div class="card">
    <span class="status"><span class="dot" class:good={health.neo4j} class:bad={!health.neo4j}></span>Neo4j</span>
    <p class="faint small mt">graph store</p>
  </div>
  <div class="card">
    <span class="status"><span class="dot" class:good={health.redis} class:bad={!health.redis}></span>Redis / BullMQ</span>
    <p class="faint small mt">queues + pub/sub</p>
  </div>
</div>

<div class="card mt2">
  <div class="eyebrow blue">Email · SMTP</div>
  <div class="grid grid-3 mt" style="font-family:var(--mono); font-size:13px; color:var(--ink-dim);">
    <div>Host <span class="faint">· {health.smtp.host || '—'}:{health.smtp.port}</span></div>
    <div>From <span class="faint">· {health.smtp.from || '—'}</span></div>
    <div>
      <span class="status"><span class="dot" class:good={health.smtp.configured} class:amber={!health.smtp.configured}></span>{health.smtp.configured ? 'configured' : 'password missing'}</span>
    </div>
  </div>

  <form on:submit={sendTest} class="mt" style="display:flex; gap:14px; flex-wrap:wrap; align-items:flex-end;">
    <div style="flex:1; min-width:220px;">
      <label for="health-to">Send test email to</label>
      <input class="input" id="health-to" type="email" bind:value={emailTo} required placeholder="you@example.com" />
    </div>
    <button class="btn solid" type="submit" disabled={busy || !health.smtp.configured}>
      {busy ? 'Sending…' : 'Send test'}
    </button>
  </form>
  {#if mailMessage}<p class="ok mt">{mailMessage}</p>{/if}
  {#if mailError}<p class="error mt">{mailError}</p>{/if}
</div>
