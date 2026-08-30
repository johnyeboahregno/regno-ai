# Shell / Bash

> Technology standard for "Shell Scripting" agents. Sources: ShellCheck, Google shell style guide.

## Scripts

- `#!/usr/bin/env bash`; `set -euo pipefail`; ShellCheck clean
- Quote all variables; prefer `[[ ]]`; arrays for arg lists
- Functions with local vars; no global state

## Robustness

- Handle failures explicitly; validate inputs and paths
- Idempotent scripts; safe temp files (`mktemp`, trap cleanup)
- Never pipe secrets; avoid `eval`

## Style

- One command per line where clarity matters; comments explain "why"
- Meaningful exit codes; print errors to stderr

## Testing

- Bats for testable scripts; shellcheck in CI; dry-run flags
