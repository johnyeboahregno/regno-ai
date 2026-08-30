# Responsive UI Guide

How the Regno web app (`apps/web`) stays usable on phones and tablets. Updated 2026-08-30.

## Breakpoints

Two standard breakpoints (used in `app.css` and scoped styles):

| Breakpoint | Meaning        |
| ---------- | -------------- |
| `900px`    | Tablet         |
| `640px`    | Phone          |

`480px` is used sparingly for the tightest single-column cases.

## Global foundation

`apps/web/src/app.css` now carries the responsive rules at the bottom of the file:

- `.wrap`, `.content`, `.page-head h1` shrink their padding/font on phones.
- `.nav-links` (marketing nav) wraps on phones.
- `.table-scroll` utility — use it instead of inline `overflow-x:auto` for table wrappers.

## App shell (sidebar)

- Desktop: sidebar stays the sticky grid column, collapsible to a 72px icon rail (`collapsed` store).
- Phone (`≤640px`): the shell becomes single-column and the sidebar turns into an **off-canvas drawer**:
  - `lib/ui.ts` exposes `mobileNavOpen` (not persisted).
  - `routes/app/+layout.svelte` renders a `.mobile-bar` (hamburger + brand) and a `.scrim` backdrop.
  - Opening the drawer resets `collapsed` to `false` so it always shows full labels.
  - Tapping any link in the drawer (or the scrim / ✕ button) closes it (`onNavigate` prop on `Sidebar.svelte`).

## Fixed-column builders

- **Genesis** (`routes/app/genesis/+page.svelte`): the `232px / 1fr / 268px` `.builder` stacks palette → canvas → config at `≤900px`. The canvas gets a `min-height` so pan/zoom still works; `.dash-grid` drops 4 → 2 → 1 columns.
- **Canvas** (`routes/app/canvas/+page.svelte`): the `240px / 1fr` split becomes a single column at `≤720px` (`.canvas-layout` class).

## Tables & fixed-width inputs

- Wide `<table>`s stay as tables inside a horizontal-scroll wrapper (`.table-scroll` or `overflow-x:auto`).
- Grid-based "tables" (health usage, Architect Age modal) get `overflow-x:auto` plus a `min-width` on rows so they scroll rather than crush.
- Fixed-width selects (chat SMA `200px`, executions depth `180px`) now cap at `max-width:100%` and wrap.

## Markdown content (Docs / Guides)

`routes/app/docs` and `routes/app/guides/[slug]` render markdown tables with `display:block; overflow-x:auto` so wide tables scroll instead of overflowing the page.

## Adding a new screen

1. Prefer auto-fit/auto-fill grids (`minmax(...)`) — they respond without media queries.
2. For side-by-side panels, add a `@media` rule that stacks them below `900px`/`720px`.
3. For any data table, put it in a `.table-scroll` wrapper.
4. Verify at `375px`, `640px`, `900px`, `1280px` in devtools.
