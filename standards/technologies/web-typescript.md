# TypeScript / Web (React, Node, SvelteKit)

> Technology standard for "Web Developer" agents. Sources: Google TS style, Airbnb style,
> official React/Node docs.

## Language

- TypeScript `strict: true` — never `any` without a documented reason
- Prefer `const`, explicit return types on public functions
- `interface` for object shapes, `type` for unions

## Structure

- One component/module per file; named exports
- Monorepo: `apps/`, `packages/` separation

## Testing

- Unit: Vitest (or Jest) — pure logic, hooks
- Component: Testing Library (user-facing behaviour, not internals)
- E2E: Playwright for critical flows
- Coverage ≥ 80% on new code

## Performance (web)

- Bundle analysis (esbuild/rollup); lazy-load routes
- Memoize expensive renders; avoid re-rendering the tree
- Core Web Vitals: LCP < 2.5s, INP < 200ms, CLS < 0.1

## CI/CD

- `tsc --noEmit` + ESLint + Prettier in CI
- Build once, deploy the artefact

## Key libraries (defaults)

- SvelteKit (or Next/React) for web; Node LTS for services
- Zod for validation; pnpm for packages
