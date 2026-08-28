<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Brand from '$lib/Brand.svelte';
  import type { LayoutData } from './$types.js';

  export let data: LayoutData;

  const nav = [
    { href: '/app/chat', label: 'Architect' },
    { href: '/app/agents', label: 'Architects' },
    { href: '/app', label: 'Dashboard' },
    { href: '/app/nexus', label: 'NEXUS' },
    { href: '/app/canvas', label: 'Canvas' },
    { href: '/app/cortex', label: 'CORTEX' },
    { href: '/app/stage', label: 'STAGE' },
    { href: '/app/genesis', label: 'Genesis' },
    { href: '/app/sentinel', label: 'Sentinel' },
    { href: '/app/launchpad', label: 'Launchpad' },
    { href: '/app/executions', label: 'Executions' },
    { href: '/app/docs', label: 'Docs' },
    { href: '/app/credentials', label: 'Credentials' },
    { href: '/app/health', label: 'Health' },
  ];

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    goto('/login');
  }
</script>

<svelte:head><title>Regno Architect Me</title></svelte:head>

<div class="shell">
  <aside class="sidebar">
    <a class="brand" href="/app"><Brand /></a>
    <div style="height:24px;"></div>
    {#each nav as n}
      <a href={n.href} class:active={$page.url.pathname === n.href}>{n.label}</a>
    {/each}
    <div class="spacer"></div>
    <div class="faint small mono" style="padding:10px 12px;">{data.user.email}</div>
    <button class="btn ghost" on:click={logout} style="margin-top:10px;">Sign out</button>
  </aside>
  <main class="content">
    <slot />
  </main>
</div>
