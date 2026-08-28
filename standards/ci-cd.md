# CI/CD Best Practices

> Non-negotiable base. Every build flows through the same pipeline, defined in code.

## Pipeline stages (in order)

1. **Install** — lockfile, clean install
2. **Lint** — static analysis + type-check
3. **Test** — unit + integration
4. **Build** — production build (reproducible, no drift)
5. **Deploy** — via the pipeline only; no manual production deploys

## Rules

1. Pipeline is code (GitHub Actions / GitLab CI / Tekton), versioned in the repo.
2. Failing lint or tests block merge.
3. Secrets from a secret store (or cluster Secret) — never in the repo or logs.
4. One-way promotion: dev → staging → prod, with gates at each stage.
5. Rollbacks are a first-class, tested path.

## Speed & reliability

- Cache dependencies and build layers.
- Parallelise independent jobs.
- Fail fast; surface the exact failing command.

## Anti-patterns

- Manual deploy steps in the docs
- Secrets committed or echoed in CI logs
- "It works on my machine" as a release strategy
