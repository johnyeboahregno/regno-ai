// Client-side UI preferences (theme + sidebar collapse), persisted to localStorage.
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'dark' | 'light' | 'tactical' | 'aurora' | 'nova' | 'emerald' | 'matrix';

export const THEMES: Theme[] = ['dark', 'light', 'tactical', 'aurora', 'nova', 'emerald', 'matrix'];

const THEME_KEY = 'regno.theme';
const COLLAPSED_KEY = 'regno.sidebar.collapsed';

function isTheme(t: string | null): t is Theme {
  return (
    t === 'dark' ||
    t === 'light' ||
    t === 'tactical' ||
    t === 'aurora' ||
    t === 'nova' ||
    t === 'emerald' ||
    t === 'matrix'
  );
}

function initialTheme(): Theme {
  if (browser) {
    const t = localStorage.getItem(THEME_KEY);
    if (isTheme(t)) return t;
  }
  return 'dark';
}

/** Cycle to the next theme. */
export function nextTheme(t: Theme): Theme {
  const i = THEMES.indexOf(t);
  return THEMES[(i + 1) % THEMES.length];
}

export const theme = writable<Theme>(initialTheme());
export const collapsed = writable<boolean>(
  browser && localStorage.getItem(COLLAPSED_KEY) === '1'
);
export const mobileNavOpen = writable<boolean>(false);

if (browser) {
  theme.subscribe((t) => {
    localStorage.setItem(THEME_KEY, t);
    document.documentElement.dataset.theme = t;
  });
  collapsed.subscribe((v) => {
    localStorage.setItem(COLLAPSED_KEY, v ? '1' : '0');
  });
}
