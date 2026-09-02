# CI/CD

> Status: superseded · Last updated: 2026-09-02

## What it is now

- **CI** — `.github/workflows/ci.yml` runs `_verify.yml` on every PR
  (install → type-check → build all workspaces).
- **Mothership deploy** — `.github/workflows/deploy-mothership.yml` rebuilds the
  control plane on merge to `master` via `docker-compose.mothership.yml`.
- **Architect deploy** — the Mothership provisioning worker (`packages/provision`)
  SSHs into each target machine and runs `deploy.sh`. No GitHub workflow deploys an Architect.

## Retired

The former GitHub → k3s pipeline was removed (Architect deployment now happens only
through the Mothership):

- `.github/workflows/deploy.yml` — production k3s deploy
- `.github/workflows/developer.yml` — developer preview namespaces
- `.github/workflows/cleanup.yml` — preview teardown
- `scripts/k8s-deploy.sh`, `scripts/spawn-agent.mjs`, `k8s/`
- `clone-developer.sh`, `migrate-k3s.sh`, `seed-k3s.sh`
