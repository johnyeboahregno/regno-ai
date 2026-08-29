<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Brand from '$lib/Brand.svelte';
  import type { LayoutData } from './$types.js';

  export let data: LayoutData;

  type NavItem = { href: string; label: string; badge?: boolean };
  type NavGroup = { title: string; items: NavItem[] };

  const groups: NavGroup[] = [
    {
      title: 'Platform',
      items: [
        { href: '/app', label: 'Dashboard' },
        { href: '/app/nexus', label: 'Nexus', badge: true },
        { href: '/app/canvas', label: 'Canvas' },
        { href: '/app/cortex', label: 'Cortex' },
        { href: '/app/stage', label: 'Stage' },
        { href: '/app/genesis', label: 'Genesis' },
        { href: '/app/chat', label: 'Architect' },
        ...(data.user.role === 'owner' ? [{ href: '/app/agents', label: 'Architects' } as NavItem] : []),
      ],
    },
    {
      title: 'Operations',
      items: [
        { href: '/app/sentinel', label: 'Sentinel' },
        { href: '/app/launchpad', label: 'Launchpad' },
        { href: '/app/executions', label: 'Executions' },
      ],
    },
    {
      title: 'Foundation',
      items: [
        { href: '/app/docs', label: 'Docs' },
        { href: '/app/credentials', label: 'Credentials' },
        { href: '/app/health', label: 'Health' },
      ],
    },
  ];

  const email = data.user?.email ?? '';
  const initials = (email.split('@')[0].split(/[._\-]/).filter(Boolean).map((s) => s[0]).join('') || 'JS')
    .slice(0, 2)
    .toUpperCase();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    goto('/login');
  }
</script>

<svelte:head><title>Regno Architect Me</title></svelte:head>

<div class="shell">
  <aside class="sidebar">
    <a class="brand" href="/app" style="padding:6px 12px 14px;"><Brand /></a>

    {#each groups as g}
      <div class="side-group">
        <div class="side-label">{g.title}</div>
        {#each g.items as n}
          <a href={n.href} class:active={$page.url.pathname === n.href}>
            {n.label}
            {#if n.badge}<span class="nav-dot"></span>{/if}
          </a>
        {/each}
      </div>
    {/each}

    <div class="spacer"></div>

    <div class="profile">
      <div class="avatar">{initials}</div>
      <div style="min-width:0;">
        <div class="p-name" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{email}</div>
        <div class="p-role">Platform Architect</div>
      </div>
    </div>
    <button class="btn ghost" on:click={logout} style="margin-top:10px; width:100%;">Sign out</button>
  </aside>
  <main class="content">
    <slot />
  </main>
</div>
