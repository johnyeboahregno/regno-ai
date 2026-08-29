<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Sidebar from '$lib/Sidebar.svelte';
  import { collapsed } from '$lib/ui';
  import type { LayoutData } from './$types.js';

  export let data: LayoutData;

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    goto('/login');
  }
</script>

<svelte:head><title>Regno Architect Me</title></svelte:head>

<div class="shell" class:collapsed={$collapsed}>
  <Sidebar user={data.user} path={$page.url.pathname} onLogout={logout} />
  <main class="content">
    <slot />
  </main>
</div>
