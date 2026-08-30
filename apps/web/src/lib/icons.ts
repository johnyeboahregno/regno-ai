// Inline SVG icon set (feather-style 24x24 stroke icons).
// Rendered via {@html} inside Icon.svelte — matches the repo convention of no external icon deps.

export const ICONS: Record<string, string> = {
  architect:
    '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
  dashboard:
    '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>',
  oracle:
    '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>',
  canvas:
    '<path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle>',
  cortex:
    '<rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line>',
  stage:
    '<polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline>',
  genesis:
    '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>',
  launchpad:
    '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>',
  sentinel:
    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
  executions:
    '<circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon>',
  docs:
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>',
  guide:
    '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>',
  database:
    '<ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>',
  cli:
    '<polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line>',
  credentials:
    '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>',
  health:
    '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>',
  agents:
    '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
  gear:
    '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>',
  logout:
    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line>',
  chevron: '<polyline points="6 9 12 15 18 9"></polyline>',
  menu:
    '<line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line>',
  x: '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>',
  sun:
    '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>',
  palette:
    '<circle cx="13.5" cy="6.5" r=".5"></circle><circle cx="17.5" cy="10.5" r=".5"></circle><circle cx="8.5" cy="7.5" r=".5"></circle><circle cx="6.5" cy="12.5" r=".5"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path>',

  // ── Architect age gimmick (theme-aware via stroke="currentColor") ─────────────────────
  'architect-age':
    '<path d="M5 3h14"></path><path d="M5 21h14"></path><path d="M6.5 3v3.2c0 1.4 1 2.6 2 3.4L11 12l-2.5 2.4c-1 .8-2 2-2 3.4V21"></path><path d="M17.5 3v3.2c0 1.4-1 2.6-2 3.4L13 12l2.5 2.4c1 .8 2 2 2 3.4V21"></path>',

  // Human evolution — ape → upright walker → astronaut
  'evo-h-ape':
    '<circle cx="12" cy="6.5" r="3"></circle><path d="M9 9.5c-2.5 1.5-3.5 5-3.5 8.5"></path><path d="M15 9.5c2.5 1.5 3.5 5 3.5 8.5"></path><path d="M5.5 18h2"></path><path d="M16.5 18h2"></path><path d="M12 9.5c-3 1.5-4.5 4.5-4.5 7.5h9c0-3-1.5-6-4.5-7.5z"></path>',
  'evo-h-walker':
    '<circle cx="12" cy="5" r="3"></circle><path d="M12 8v4"></path><path d="M8.5 10.5L12 9l3.5 1.5"></path><path d="M9.5 21l2.5-6 2.5 6"></path>',
  'evo-h-astronaut':
    '<circle cx="12" cy="6" r="4"></circle><path d="M9 5.2a4 4 0 0 1 6 0"></path><rect x="8.5" y="10" width="7" height="7" rx="2.5"></rect><path d="M10.5 17v2.5"></path><path d="M13.5 17v2.5"></path><path d="M9.5 21.5h5"></path>',

  // AI evolution — abacus → terminal → robot → neural net
  'evo-ai-abacus':
    '<rect x="5" y="3" width="14" height="18" rx="2"></rect><line x1="5" y1="8" x2="19" y2="8"></line><line x1="5" y1="13" x2="19" y2="13"></line><line x1="5" y1="18" x2="19" y2="18"></line><circle cx="8" cy="10.5" r="1"></circle><circle cx="12" cy="15.5" r="1"></circle><circle cx="16" cy="10.5" r="1"></circle><circle cx="8" cy="15.5" r="1"></circle><circle cx="16" cy="15.5" r="1"></circle>',
  'evo-ai-terminal':
    '<rect x="2" y="4" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><polyline points="6 9 9 12 6 15"></polyline><line x1="12" y1="15" x2="16" y2="15"></line>',
  'evo-ai-robot':
    '<rect x="4" y="7" width="16" height="13" rx="3"></rect><line x1="12" y1="3" x2="12" y2="7"></line><circle cx="12" cy="2.5" r="1"></circle><circle cx="9.5" cy="12" r="1.3"></circle><circle cx="14.5" cy="12" r="1.3"></circle><line x1="9.5" y1="16" x2="14.5" y2="16"></line>',
  'evo-ai-brain':
    '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="5.5" r="1.5"></circle><circle cx="6.5" cy="16" r="1.5"></circle><circle cx="17.5" cy="16" r="1.5"></circle><line x1="12" y1="5.5" x2="6.5" y2="16"></line><line x1="12" y1="5.5" x2="17.5" y2="16"></line><line x1="6.5" y1="16" x2="17.5" y2="16"></line>',
};
