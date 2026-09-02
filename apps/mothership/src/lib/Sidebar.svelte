<script lang="ts">
  import { Brand, Icon, StatusPulse } from '@regno/ui';
  import { theme, collapsed, nextTheme, type Theme } from '@regno/ui';
  import { buildNav, groupContainsPath, itemMatchesPath, type NavGroup, type NavItem } from '$lib/nav';

  export let user: { email: string; role: string };
  export let path: string;
  export let onLogout: () => void = () => {};
  export let onNavigate: () => void = () => {};

  const nav = buildNav(user.role);

  let open: Record<string, boolean> = {};

  function isActive(item: NavItem, p = path): boolean {
    return itemMatchesPath(item, p);
  }

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

  function handleClick(e: MouseEvent) {
    const t = e.target as Element | null;
    if (t && t.closest && t.closest('a')) onNavigate();
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

<aside class="sidebar" on:click={handleClick}>
  <div class="sb-head">
    {#if !$collapsed}
      <div class="sb-brand">
        <a class="brand" href="/app" aria-label="Regno Mothership home"><Brand variant={$theme === 'light' ? 'dark' : 'light'} /></a>
        <span class="ms-sublabel">Mothership</span>
      </div>
      <span class="sb-status" title="All systems operational" aria-label="System status: all systems operational"><StatusPulse size={16} /></span>
    {:else}
      <span class="brand-mark" aria-hidden="true"></span>
    {/if}
    <button
      class="sb-close"
      on:click={() => onNavigate()}
      title="Close menu"
      aria-label="Close menu"
    >
      <Icon name="x" size={18} />
    </button>
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
              <a
                href={item.href}
                class="item"
                class:active={isActive(item)}
                title={item.label}
                aria-current={isActive(item) ? 'page' : undefined}
              >
                <span class="ic-wrap"><Icon name={item.icon} size={16} /></span>
                <span class="label">{item.label}</span>
              </a>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </nav>

  <div class="spacer"></div>

  <div class="sb-foot">
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
