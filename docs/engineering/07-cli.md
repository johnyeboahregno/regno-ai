# CLI

> Status: stable · Last updated: 2026-08-28

## What it is

The `regno` CLI (`packages/cli`) — a zero-dependency TypeScript command runner using
`node:util` `parseArgs` + native `fetch`.

## Why

Drive the platform from the terminal: login, run executions, manage credentials, seed the brain.

## How it works

- `packages/cli/src/cli.ts` dispatches subcommands; `bin/regno.mjs` runs it via `tsx`.
- Auth: `login` stores the session cookie at `~/.regno/auth.json`; later commands send it.
- Seed commands shell out to `scripts/*.mjs`.

## Commands

```
regno login --email <e> --password <p>
regno run "<prompt>" [--depth quick|standard|deep]
regno credentials list|add|reveal|remove
regno remember "content" [--category note]
regno pattern add --name --description [--tags a,b]
regno developer add --slug --name
regno persona create --slug --name [--developer d]
regno db init · brain seed · history ingest · github ingest · profile seed · standards seed
```

## Reproduce / verify

```bash
npm run cli -- --help        # or: npx tsx packages/cli/src/cli.ts --help
```
