# CI/CD Standard

> Non-negotiable base. Every build flows through the same pipeline.

## Pipeline stages (in order)

1. **Install** — lockfile, clean install
2. **Lint** — static analysis, type-check
3. **Test** — unit + integration
4. **Build** — production build
5. **Deploy** — to the environment, via the pipeline only

## Rules

- No manual deploy to production
- Pipeline is defined in code (e.g. `.github/workflows`, `Dockerfile`, manifests)
- Failing lint/tests block the pipeline
- Secrets come from the environment/secret store, never the repo

*(Replace with your organisation's real CI/CD rules.)*
