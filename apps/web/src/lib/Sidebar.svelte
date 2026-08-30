<script lang="ts">
  import Brand from '$lib/Brand.svelte';
  import Icon from '$lib/Icon.svelte';
  import ArchitectAgeWidget from '$lib/ArchitectAgeWidget.svelte';
  import { buildNav, groupContainsPath, type NavGroup, type NavItem } from '$lib/nav';
  import { theme, collapsed, nextTheme, type Theme } from '$lib/ui';
  import { onMount } from 'svelte';

  export let user: { email: string; role: string };
  export let path: string;
  export let onLogout: () => void;

  const baseNav = buildNav(user.role);
  let docsChildren: NavItem[] = [];

  // Inject the dynamic Docs submenu (artifacts + ingested docs) once it loads.
  $: nav = baseNav.map((group) =>
    group.id === 'system'
      ? {
          ...group,
          items: group.items.map((item) =>
            item.href === '/app/docs' ? { ...item, children: docsChildren } : item,
          ),
        }
      : group,
  );

  let open: Record<string, boolean> = {};

  function basename(p: string): string {
    return p.split('/').pop() ?? p;
  }

  function isActive(item: NavItem): boolean {
    if (path === item.href || path.startsWith(item.href + '?')) return true;
    return (item.children ?? []).length > 0 && path.startsWith(item.href + '/');
  }

  onMount(async () => {
    try {
      const [dr, ar] = await Promise.all([
        fetch('/api/docs').then((r) => r.json()),
        fetch('/api/artifacts').then((r) => r.json()),
      ]);
      const next: NavItem[] = [];
      for (const a of ar.artifacts ?? []) {
        if (!a.taskId) continue;
        next.push({
          href: `/app/docs?artifact=${encodeURIComponent(a.taskId)}`,
          label: a.title ?? a.taskId,
          icon: 'docs',
          group: 'Artifacts',
        });
      }
      for (const g of dr.groups ?? []) {
        for (const d of g.docs ?? []) {
          if (!d.sourceUrl) continue;
          next.push({
            href: `/app/docs?doc=${encodeURIComponent(d.sourceUrl)}`,
            label: basename(d.title ?? d.sourceUrl),
            icon: 'docs',
            group: g.domain,
          });
        }
      }
      docsChildren = next;
    } catch {
      /* ignore */
    }
  });

  // Auto-open the section that contains the current path on navigation.
  $: path, ensureActiveSectionOpen(path);

  function ensureActiveSectionOpen(p: string) {
    if (!p) return;
    const next = { ...open };
    let changed = false;
    for (const group of nav) {
      if (groupContainsPath(group, p) && !next[group.id]) {
        next[group.id] = true;
        changed = true;
      }
    }
    if (changed) open = next;
  }

  function toggleSection(group: NavGroup) {
    if ($collapsed) {
      collapsed.set(false);
      open = { ...open, [group.id]: true };
      return;
    }
    open = { ...open, [group.id]: !open[group.id] };
  }

  function toggleTheme() {
    theme.set(nextTheme($theme));
  }

  function themeName(t: Theme): string {
    switch (t) {
      case 'light':
        return 'Daylight';
      case 'tactical':
        return 'Tactical';
      case 'aurora':
        return 'Aurora';
      case 'nova':
        return 'Nova';
      case 'emerald':
        return 'Emerald';
      case 'matrix':
        return 'Matrix';
      default:
        return 'Midnight';
    }
  }

  // Identity helpers — the app has no `name` field, so derive a display name and initials from email.
  const local = (user.email.split('@')[0] || '').replace(/[._-]+/g, ' ').trim();
  const displayName = local
    ? local
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(' ')
    : user.email;
  const initials = (() => {
    const parts = local.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (user.email[0] || '?').toUpperCase();
  })();
</script>

<aside class="sidebar">
  <div class="sb-head">
    {#if !$collapsed}
      <a class="brand" href="/app" aria-label="Regno home"><Brand variant={$theme === 'light' ? 'dark' : 'light'} /></a>
    {:else}
      <span class="brand-mark" aria-hidden="true"></span>
    {/if}
    <button
      class="sb-toggle"
      on:click={() => collapsed.set(!$collapsed)}
      title={$collapsed ? 'Expand menu' : 'Collapse menu'}
      aria-label={$collapsed ? 'Expand menu' : 'Collapse menu'}
    >
      <Icon name="menu" size={18} />
    </button>
  </div>

  <nav class="sb-nav">
    {#each nav as group}
      <div class="section">
        <button
          class="section-head"
          class:open={!!open[group.id]}
          class:active={groupContainsPath(group, path)}
          on:click={() => toggleSection(group)}
          title={group.title}
          aria-expanded={$collapsed ? false : !!open[group.id]}
        >
          <span class="ic-wrap"><Icon name={group.icon} size={18} /></span>
          <span class="label">{group.title}</span>
          <span class="chev" aria-hidden="true"><Icon name="chevron" size={14} /></span>
        </button>

        {#if !$collapsed && open[group.id]}
          <div class="section-body">
            {#each group.items as item}
              <a href={item.href} class="item" class:active={isActive(item)} title={item.label} aria-current={isActive(item) ? 'page' : undefined}>
                <span class="ic-wrap"><Icon name={item.icon} size={16} /></span>
                <span class="label">{item.label}</span>
              </a>
              {#if item.children}
                <div class="sub-body">
                  {#each item.children as child, i}
                    {#if child.group && child.group !== item.children[i - 1]?.group}
                      <div class="sub-group">{child.group}</div>
                    {/if}
                    <a href={child.href} class="item sub" class:active={isActive(child)} title={child.label}>
                      <span class="label">{child.label}</span>
                    </a>
                  {/each}
                </div>
              {/if}
            {/each}

            {#if group.id === 'intelligence'}
              <ArchitectAgeWidget />
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </nav>

  <div class="spacer"></div>

  <div class="sb-foot">
    <a href="/app/settings" class="foot-item" class:active={path === '/app/settings'} title="Settings">
      <Icon name="gear" size={17} />
      <span class="label">Settings</span>
    </a>
    <button class="foot-item" on:click={onLogout} title="Sign out">
      <Icon name="logout" size={17} />
      <span class="label">Sign out</span>
    </button>
    <button class="foot-item" on:click={toggleTheme} title={`Theme: ${themeName($theme)} — click to switch`}>
      <Icon name="palette" size={17} />
      <span class="label">{themeName($theme)}</span>
    </button>

    <div class="profile" title={user.email}>
      <span class="avatar" aria-hidden="true">{initials}</span>
      <span class="profile-meta">
        <span class="p-name">{displayName}</span>
        <span class="p-email">{user.email}</span>
      </span>
    </div>
  </div>
</aside>
