// Mothership navigation — single source of truth for the control-plane sidebar.
export interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** Optional submenu section header (unused in the Mothership shell). */
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
      id: 'system',
      title: 'System',
      icon: 'gear',
      items: [
        { href: '/app', label: 'Dashboard', icon: 'dashboard' },
        { href: '/app/architects', label: 'Architects', icon: 'architects' },
        { href: '/app/credentials', label: 'Credentials', icon: 'credentials' },
        { href: '/app/health', label: 'Health', icon: 'health' },
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
