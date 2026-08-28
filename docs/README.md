# Regno.ai — Documentation Index

Docs are organised one level deep (`category/file`) to match the
`/api/docs/content` path rule and the admin Docs viewer. Two operational
files stay at the root because code and the admin dashboard reference them
by a fixed path.

## Root (operational — do not move)

- **platform-todo-registry.md** — the canonical task registry. Parsed by
  `scripts/seed-platform-todos.cjs` and the `/admin/todos` sync API; surfaced
  live at `/admin/todos`.
- **README.md** — this index.

## Categories

| Folder | What lives here |
|---|---|
| `governance/` | Governance & trust substrate: `governance-platform.md` (technical reference), exec summary (`.md`/`.html`), roadmap, phase-1 backlog, and the public-facing `regno-governance-executive.html` / `regno-governance-technical.html` (advertised by `/.well-known/trust.json`). |
| `strategy/` | Platform strategy & roadmap: `regno-roadmap.html`, `regno-strategic-case.html`, showcase brief, capability-enhancement and refactoring plans, Cortex Flow enhancement roadmap. |
| `usp/` | Persona USP briefs — why the platform excels, one per reader: `regno-usp-cto.html`, `regno-usp-investor.html`, `regno-usp-procurement.html`, `regno-usp-engineer.html`. |
| `evaluations/` | Architecture evaluations, e.g. `regno-vs-cookbook-evaluation.md`. |
| `knowledge/` | Knowledge & wisdom systems: ingestion pipeline, scoring, knowledge system, wisdom system. |
| `cms/` | CMS reference: audit, gate reference, process runner, rule-engine benchmark, walk roadmap. |
| `references/` | Standalone references: canonical about, alias/impersonation, deploy, legacy-compat principle, route-auth audit, research-agent acceptance criteria, widget readme. |
| `_archive/` | Superseded / scratch material kept for history (`tmp/`, session summaries, the prior org note). |

## Pre-existing category folders

`stage/`, `cortex/`, `cortex-flow/`, `maestro/`, `canvas-pipeline/`,
`charts-visualization/`, `infrastructure/`, `authentication/`, `ui-ux/`,
`fixes/`, `guides/`, `architecture/`, `agents/`, `pipeline/`, `pipelines/`,
`compare/`, `case studies/`, `kyma/`, `performance/`, `pitch/`,
`regno-standard/` — organised in an earlier pass; left as-is.

## Conventions

- One level of nesting only (`category/file`) — deeper paths are rejected by
  the docs content API for traversal safety.
- Friendly category names live in `src/routes/api/docs/list/+server.ts`.
- The roadmap, exec summary and strategic case have credits auto-embedded by
  `scripts/embed-about-into-docs.cjs` — update that script's target list if you
  move them.
