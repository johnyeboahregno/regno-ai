# CORTEX Brain

> Status: stable · Last updated: 2026-08-28

## What it is

The memory/knowledge system: ingestion, patterns, memories, and wisdom — the compounding brain.

## Why

The "Regno Architect Me" learns from your code and docs so it builds faster over time
(`docs/cortex-flow-design.md`, `docs/knowledge/knowledge-system.md`).

## How it works

- **Ingestion** — `scripts/seed-brain.mjs` (docs), `seed-history.mjs` (local repos),
  `seed-github.mjs` (GitHub org) → `cortex_index` (Mongo) + `doc_search` (Qdrant). Raw docs are
  always stored; embeddings are best-effort (need `OPENAI_API_KEY`).
- **Patterns** — `createPattern()` → `writePattern()` (three-store sync).
- **Memories** — `remember()` → `writeWisdom()` (`cortex_agent_memories` + `cortex_wisdom`).
- **Profile** — `seed-profile.mjs` stores `profile/user-conventions.md` as a profile memory.

## Files involved

- `packages/cortex/src/{knowledge,patterns,memories}.ts`
- `packages/ai/src/index.ts` (embeddings)
- `scripts/seed-brain.mjs`, `seed-history.mjs`, `seed-github.mjs`, `seed-profile.mjs`

## Reproduce / verify

```bash
node scripts/seed-brain.mjs        # docs → cortex_index + doc_search
node scripts/seed-history.mjs      # profile/repos.json → your repos
DEVELOPER=jsmith node scripts/seed-history.mjs   # tag a developer's flavour
```
