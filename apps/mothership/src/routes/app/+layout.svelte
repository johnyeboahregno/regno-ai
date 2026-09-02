<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Sidebar from '$lib/Sidebar.svelte';
  import { Brand, Icon } from '@regno/ui';
  import { collapsed, mobileNavOpen, theme } from '@regno/ui';
  import type { LayoutData } from './$types.js';

  export let data: LayoutData;

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    goto('/api/auth/sso/start');
  }

  function openMobileNav() {
    collapsed.set(false);
    mobileNavOpen.set(true);
  }

  function closeMobileNav() {
    mobileNavOpen.set(false);
  }
</script>

<svelte:head><title>Regno Mothership</title></svelte:head>

<div class="mobile-bar">
  <button class="mb-btn" on:click={openMobileNav} aria-label="Open menu">
    <Icon name="menu" size={20} />
  </button>
  <a class="brand" href="/app"><Brand variant={$theme === 'light' ? 'dark' : 'light'} /></a>
  <span class="ms-label">MOTHERSHIP</span>
</div>

<div class="shell" class:collapsed={$collapsed} class:mobile-open={$mobileNavOpen}>
  <Sidebar user={data.user} path={$page.url.pathname + $page.url.search} onLogout={logout} onNavigate={closeMobileNav} />
  <main class="content">
    <slot />
  </main>
</div>

{#if $mobileNavOpen}
  <button class="scrim" on:click={closeMobileNav} aria-label="Close menu"></button>
{/if}
