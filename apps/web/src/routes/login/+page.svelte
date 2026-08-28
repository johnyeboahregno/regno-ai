<script lang="ts">
  import { goto } from '$app/navigation';
  import Brand from '$lib/Brand.svelte';
  let email = '';
  let password = '';
  let error = '';
  let busy = false;

  async function submit(e: Event) {
    e.preventDefault();
    busy = true;
    error = '';
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json();
      if (d.ok) {
        goto('/app');
        return;
      }
      error = d.error ?? 'Login failed';
    } catch {
      error = 'Cannot reach the server — make sure you are using the live URL (not localhost).';
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head><title>Sign in — Regno Architect Me</title></svelte:head>

<div class="wrap" style="display:grid; place-items:center; min-height:100vh;">
  <div class="card" style="width:100%; max-width:420px; padding:36px;">
    <a class="brand mb" href="/"><Brand /></a>
    <div class="eyebrow blue mb">Sign in</div>
    <h1 style="font-size:26px;">Welcome back.</h1>
    <p class="muted small mb">Access your self-hosted Regno platform.</p>

    {#if error}<p class="error mb">{error}</p>{/if}

    <form on:submit={submit}>
      <label for="email">Email</label>
      <input class="input mb" id="email" type="email" bind:value={email} required autocomplete="email" />
      <label for="password">Password</label>
      <input class="input mb" id="password" type="password" bind:value={password} required autocomplete="current-password" />
      <button class="btn solid" type="submit" disabled={busy} style="width:100%; justify-content:center;">
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>

    <p class="muted small mt">No account? <a href="/register" style="color:var(--signal);">Create one</a></p>
  </div>
</div>
