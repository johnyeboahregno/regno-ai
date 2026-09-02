<script lang="ts">
  import { goto } from '$app/navigation';
  import { Brand, PasswordInput } from '@regno/ui';
  let email = '';
  let password = '';
  let error = '';
  let busy = false;

  async function submit(e: Event) {
    e.preventDefault();
    if (password.length < 8) {
      error = 'Password must be at least 8 characters';
      return;
    }
    busy = true;
    error = '';
    try {
      const r = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json();
      if (d.ok) {
        goto('/app');
        return;
      }
      error = d.error ?? 'Registration failed';
    } catch {
      error = 'Cannot reach the server — make sure you are using the live URL (not localhost).';
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head><title>Create account — Regno Architect Me</title></svelte:head>

<div class="wrap" style="display:grid; place-items:center; min-height:100vh;">
  <div class="card" style="width:100%; max-width:420px; padding:clamp(20px, 6vw, 36px);">
    <a class="brand mb" href="/"><Brand /></a>
    <div class="eyebrow blue mb">Create account</div>
    <h1 style="font-size:26px;">Start fresh.</h1>
    <p class="muted small mb">The first account becomes the owner.</p>

    {#if error}<p class="error mb">{error}</p>{/if}

    <form on:submit={submit}>
      <label for="email">Email</label>
      <input class="input mb" id="email" type="email" bind:value={email} required autocomplete="email" />
      <label for="password">Password</label>
      <div class="mb">
        <PasswordInput bind:value={password} autocomplete="new-password" minlength={8} />
      </div>
      <button class="btn solid" type="submit" disabled={busy} style="width:100%; justify-content:center;">
        {busy ? 'Creating…' : 'Create account'}
      </button>
    </form>

    <p class="muted small mt">Already have an account? <a href="/login" style="color:var(--signal);">Sign in</a></p>
  </div>
</div>
