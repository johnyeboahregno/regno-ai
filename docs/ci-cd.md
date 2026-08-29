# CI/CD — GitHub Actions → k3s

The deployment is fully automated in GitHub Actions. On every push to `master` the pipeline
**tests → builds → deploys to the k3s cluster → validates the deployed version**, and rolls back
automatically if validation fails. Individual developers get isolated preview namespaces.

## Pipeline stages

| Stage | What runs | Where |
|---|---|---|
| 1. Install | `npm ci` (lockfile, clean install) | GitHub-hosted runner |
| 2. Type-check | `npm run check -w @regno/web` (svelte-check) | GitHub-hosted runner |
| 3. Build | `npm run build` (type-checks all packages + apps, builds web) | GitHub-hosted runner |
| 4. Build images | `docker build` for `web`, `execution`, `realtime` (tag `:latest`) | Self-hosted runner on the k3s node |
| 5. Deploy | create Secret + `kubectl apply` + `rollout status` | Self-hosted runner |
| 6. Validate | `curl http://localhost:<port>/api/health` → expect `"ok":true` | Self-hosted runner |
| 7. Rollback | `kubectl rollout undo` on web/execution/realtime if validation fails | Self-hosted runner |

## Workflows

| File | Trigger | What it does |
|---|---|---|
| `.github/workflows/_verify.yml` | reusable (`workflow_call`) | The shared test/build gate |
| `.github/workflows/ci.yml` | `pull_request` | Runs the verify gate only (blocks bad merges) |
| `.github/workflows/deploy.yml` | `push` to `master`/`main`, manual | Verify → deploy to `default` namespace → validate → rollback on failure |
| `.github/workflows/developer.yml` | manual, or `push` to `dev-*` / `developer/*` | Verify → deploy to `dev-<slug>` namespace on a unique port → validate |
| `.github/workflows/cleanup.yml` | PR closed, or manual | Deletes the developer's preview namespace |

## Why a self-hosted runner

The k8s manifests use local image names (`regno-architect-web:latest`) with
`imagePullPolicy: IfNotPresent`, so no container registry is needed: the deploy job builds the
images directly on the k3s node and `kubectl apply` picks them up. A GitHub-hosted runner can't
reach the node's docker daemon or the cluster, hence a **self-hosted runner on the k3s box**.

> Alternative (if you prefer GitHub-hosted runners for everything): build the images in CI, push
> them to a registry (e.g. GHCR), change the manifests to pull `imagePullPolicy: Always` with
> versioned tags, and SSH into the box to `kubectl set image`. That needs a registry + SSH secrets
> and is more moving parts — not required for this single-node setup.

## One-time setup

1. **Register a self-hosted runner** on the k3s node (as the deploy user):
   ```bash
   # On the k3s box — Repo → Settings → Actions → Runners → New self-hosted runner
   # Add label "k3s" during registration (./config.sh --labels self-hosted,linux,k3s)
   sudo ./svc.sh install && sudo ./svc.sh start
   ```
2. **Give the runner user access:**
   ```bash
   sudo usermod -aG docker $RUNNER_USER        # docker build without sudo
   # and make sure `kubectl` works without sudo, OR set KUBECTL below to "sudo kubectl"
   ```
3. **Optional repository variable** (Repo → Settings → Secrets and variables → Actions → Variables):
   - `KUBECTL` = `sudo kubectl` (only if the runner user needs sudo for kubectl; default is `kubectl`).
4. **Secrets:** none are stored in GitHub. The `regno-env` Secret is built from `.env.prod` already
   present on the box (`~/regno/.env.prod` or `/opt/regno/.env.prod`). It is never committed or
   echoed in CI logs.

## How it works for different developers

Each developer gets an **isolated k3s namespace** (`dev-<slug>`) with **unique host ports**, so
many developers can deploy and test simultaneously without touching production:

- **Manual:** Actions → "Deploy (developer preview)" → Run workflow → enter `slug` (and optionally a
  port; leave `0` to auto-assign a deterministic port in 3000–3999 from the slug).
- **Push:** push a branch named `dev-<slug>` or `developer/<slug>`; the workflow derives the slug and
  port from the branch name automatically.
- **Teardown:** when the preview PR is merged/closed, `cleanup.yml` deletes the namespace (or delete
  manually via the "Teardown developer preview" action).

The deploy logic itself lives in `scripts/k8s-deploy.sh` and is identical for production and
previews — only the namespace and port differ:

```bash
bash scripts/k8s-deploy.sh                        # production  → namespace default, web :3000
bash scripts/k8s-deploy.sh -n dev-jsmith -p 3010  # preview     → namespace dev-jsmith, web :3010
```

Each namespace runs its own full stack (MongoDB, Qdrant, Neo4j, Redis + the three apps), so a
developer's preview is a complete, independent environment.

## Concurrency & safety

- `concurrency` groups prevent two deploys of the same target (production, or the same developer
  namespace) running in parallel.
- Production deploys never cancel in-flight runs (`cancel-in-progress: false`).
- Validation failure triggers an automatic `rollout undo`, leaving the previous healthy version
  running.
