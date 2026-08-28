# Coding Standards

> Non-negotiable base. The Regno Architect follows these on every build, regardless of
> the developer "flavour" it learns.

## Language & stack

- TypeScript (strict mode) + SvelteKit for web apps
- Node.js (LTS) for services; Docker/Kubernetes for deployment
- (edit to match your stack)

## Style

- 2-space indentation, no tabs
- Single quotes, semicolons required
- Explicit types over `any` (ban `any` unless unavoidable, with a comment why)
- Consistent naming: `camelCase` for vars/functions, `PascalCase` for types/classes

## Structure

- Monorepo with clear separation: `apps/`, `packages/`, `scripts/`, `docs/`
- One concern per module/file; no god-files

## Error handling

- Handle errors explicitly; never swallow silently
- Use typed error responses at API boundaries

## Rules

- No hard-coded secrets — read from env
- Every external call has a timeout
- Idempotent operations where possible

*(Replace with your organisation's real conventions.)*
