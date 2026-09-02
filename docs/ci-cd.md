# CI/CD — verify, then deploy through the Mothership

Regno's CI/CD has two halves:

1. **Continuous integration** (GitHub Actions) — every PR is verified, and the Mothership
   control plane is deployed on merge to `master`.
2. **Deployment of Architects** — handled by the **Mothership**, not GitHub Actions.

## GitHub Actions workflows

| File | Trigger | What it does |
|---|---|---|
| `.github/workflows/_verify.yml` | reusable (`workflow_call`) | install → type-check (`svelte-check`) → build all workspaces |
| `.github/workflows/ci.yml` | `pull_request` | runs the verify gate only (blocks bad merges) |
| `.github/workflows/deploy-mothership.yml` | `push` to `master`/`main`, manual | SSHes into the Mothership VPS, `git pull`, rebuilds `docker-compose.mothership.yml` |

## How Architects are deployed

Architects are **not** deployed by GitHub Actions. The flow is:

```
Mothership UI → Architects → New Architect
  → execution worker (apps/execution → packages/provision)
  → SSH into the target machine
  → write .env.prod → run deploy.sh (Docker Compose) → register Cloudflare DNS
```

The provisioning worker is the only thing that touches a developer's machine. See
`docs/engineering/30-mothership-deploy.md` (deploy) and
`docs/engineering/31-architect-telemetry.md` (heartbeat).
