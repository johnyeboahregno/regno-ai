// App-shell navigation model — single source of truth for the sidebar menu.
// Groups act as the expandable "parents" (matching the reference menu's parent→child concept);
// the NavItem.children field additionally supports nested submenus for future routes.

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** Optional submenu section header (used by the dynamic Docs submenu). */
  group?: string;
  children?: NavItem[];
}

export interface NavGroup {
  id: string;
  title: string;
  icon: string;
  items: NavItem[];
}

export function buildNav(role: string): NavGroup[] {
  return [
    {
      id: 'build',
      title: 'Build',
      icon: 'genesis',
      items: [
        { href: '/app/chat', label: 'Architect', icon: 'architect' },
        { href: '/app/cli', label: 'CLI', icon: 'cli' },
        { href: '/app/canvas', label: 'Canvas', icon: 'canvas' },
        { href: '/app/stage', label: 'Stage', icon: 'stage' },
        { href: '/app/genesis', label: 'Genesis', icon: 'genesis' },
        { href: '/app/launchpad', label: 'Launchpad', icon: 'launchpad' },
      ],
    },
    {
      id: 'intelligence',
      title: 'Intelligence',
      icon: 'cortex',
      items: [
        { href: '/app/oracle', label: 'Oracle', icon: 'oracle' },
        { href: '/app/cortex', label: 'Cortex', icon: 'cortex' },
        { href: '/app/sentinel', label: 'Sentinel', icon: 'sentinel' },
        { href: '/app/executions', label: 'Executions', icon: 'executions' },
      ],
    },
    {
      id: 'system',
      title: 'System',
      icon: 'gear',
      items: [
        { href: '/app', label: 'Dashboard', icon: 'dashboard' },
        { href: '/app/docs', label: 'Docs', icon: 'docs' },
        { href: '/app/credentials', label: 'Credentials', icon: 'credentials' },
        { href: '/app/health', label: 'Health', icon: 'health' },
        ...(role === 'owner' ? [{ href: '/app/agents', label: 'SMA', icon: 'agents' }] : []),
      ],
    },
  ];
}

/** True when a path belongs to a group (exact item match, or nested child match). */
export function groupContainsPath(group: NavGroup, path: string): boolean {
  return group.items.some((item) => itemMatchesPath(item, path));
}

/** True when a nav item (or any nested child) matches the given path. */
export function itemMatchesPath(item: NavItem, path: string): boolean {
  if (item.href === path || path.startsWith(item.href + '?')) return true;
  const kids = item.children ?? [];
  if (kids.length > 0 && path.startsWith(item.href + '/')) return true;
  return kids.some((child) => itemMatchesPath(child, path));
}
