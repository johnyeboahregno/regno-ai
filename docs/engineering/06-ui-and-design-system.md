# UI & Design System

> Status: stable · Last updated: 2026-08-28

## What it is

The dark "spec-tech" design system and all app pages, using the real Regno logo assets.

## Why

Rebuild the regno.ai UI with a distinct look & feel derived from the SMA proposal
(`regnoai-sma-proposal.html`), with authentication and the core surfaces.

## How it works

- Design tokens in `apps/web/src/app.css`: `--bg #0a0e15`, signal indigo `#5b6ef5`,
  fonts Space Grotesk / IBM Plex Sans / IBM Plex Mono, grid background, panels/buttons/tables.
- `apps/web/src/lib/Brand.svelte` renders the real logos from `/static`:
  `logov2.png` (light), `logov2_BLK.png` (dark), `logoPurple.png` (favicon).
- Pages: landing, login/register, `/app` (dashboard, chat, nexus, cortex, canvas, stage,
  executions, docs, credentials, health), `/apps` (App Chooser).

## Files involved

- `apps/web/src/app.css`, `src/lib/Brand.svelte`
- `apps/web/src/routes/**/+page.svelte`
- `apps/web/static/{logov2,logov2_BLK,logoPurple}.png`

## Reproduce / verify

```bash
npm run dev:web            # http://localhost:5173
# in prod: https://john.regno.ai
```
