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
| 4. Build & push | `docker build` + `docker push` to Docker Hub (`regnodockerhub/regno-*:<sha>`) | Self-hosted runner on the k3s node |
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

Images are pushed to **Docker Hub** (`regnodockerhub/regno-{web,execution,realtime}`) with a unique
tag per commit (`sha-<short-sha>`). The deploy step still runs on a **self-hosted runner on the k3s
box** because only it can reach the cluster (`kubectl`); the kubelet pulls the app images from Docker
Hub, so the node no longer needs the images built locally. The test/build gate runs on GitHub-hosted
runners, so the box only does docker build/push + kubectl.

> If you'd rather not run anything on the box, you can build + push on GitHub-hosted runners and
> deploy over SSH (`kubectl set image`), but that adds SSH keys and is more moving parts for a
> single-node setup — the self-hosted runner is simpler.

## One-time setup

1. **Docker Hub** — create the three repositories and an access token:
   - Repos: `regnodockerhub/regno-web`, `regnodockerhub/regno-execution`, `regnodockerhub/regno-realtime`
     (public is simplest; for private repos see the note below)
   - Token: Hub → Account Settings → Security → **Access Tokens** → New Access Token (scope: Read, Write, Delete)
2. **Add GitHub secrets** (Repo → Settings → Secrets and variables → Actions → Secrets):
   - `DOCKERHUB_USERNAME` = `regnodockerhub`
   - `DOCKERHUB_TOKEN` = the access token from step 1
3. **Register a self-hosted runner** on the k3s node (as the deploy user):
   ```bash
   # On the k3s box — Repo → Settings → Actions → Runners → New self-hosted runner
   # Add label "k3s" during registration (./config.sh --labels self-hosted,linux,k3s)
   sudo ./svc.sh install && sudo ./svc.sh start
   ```
4. **Give the runner user access:**
   ```bash
   sudo usermod -aG docker $RUNNER_USER        # docker build/push without sudo
   # kubectl: copy the k3s kubeconfig into the runner user's home so `kubectl` works without sudo:
   mkdir -p ~/.kube
   sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config && sudo chown $USER ~/.kube/config
   ```
   If the runner must use `sudo kubectl` instead, export `KUBECTL="sudo kubectl"` in the runner
   user's environment (the deploy script reads `$KUBECTL`, default `kubectl`).
5. **Cluster secrets:** the `regno-env` Secret is built from `.env.prod` already present on the box
   (`~/regno/.env.prod` or `/opt/regno/.env.prod`). It is never committed or echoed in CI logs.

> **Private Docker Hub repos:** if you keep the repos private, the kubelet can't pull them without
> credentials. Either make them public, or create an image pull secret in each namespace:
> ```bash
> kubectl -n <ns> create secret docker-registry regcred \
>   --docker-server=https://index.docker.io/v1/ \
>   --docker-username=regnodockerhub \
>   --docker-password=<access-token>
> ```
> and add `imagePullSecrets: [{ name: regcred }]` to the pod specs in `k8s/app.yaml`. Public repos
> avoid this entirely.

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
bash scripts/k8s-deploy.sh \
  -r regnodockerhub/regno --tag sha-abc1234 --push               # production → default ns, :3000
bash scripts/k8s-deploy.sh -n dev-jsmith -p 3010 \
  -r regnodockerhub/regno --tag sha-abc1234 --push               # preview    → dev-jsmith, :3010
```

Each namespace runs its own full stack (MongoDB, Qdrant, Neo4j, Redis + the three apps), so a
developer's preview is a complete, independent environment.

## Concurrency & safety

- `concurrency` groups prevent two deploys of the same target (production, or the same developer
  namespace) running in parallel.
- Production deploys never cancel in-flight runs (`cancel-in-progress: false`).
- Validation failure triggers an automatic `rollout undo`, leaving the previous healthy version
  running.
