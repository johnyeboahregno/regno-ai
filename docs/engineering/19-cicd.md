# CI/CD (GitHub Actions → k3s)

> Status: stable · Last updated: 2026-08-29

## What it is

Push-to-master deployment with validation: **test → build → deploy to k3s → validate → auto-rollback**,
plus isolated per-developer preview namespaces.

## Workflows (`.github/workflows/`)

| File | Trigger | What it does |
|---|---|---|
| `_verify.yml` | (reusable) | install → type-check (web) → build all workspaces |
| `ci.yml` | pull_request | runs `_verify` as the PR gate |
| `deploy.yml` | push to master/main | verify → build/push images → deploy (default ns) → validate → rollback on fail |
| `developer.yml` | push to `dev-*` / `developer/*` or manual | verify → deploy to `dev-<slug>` namespace on a unique port |
| `cleanup.yml` | PR closed / manual | delete the preview namespace |

## The deploy script (`scripts/k8s-deploy.sh`)

One script drives both production and developer deploys:
`build → push → namespace + secret → apply manifests (unique hostPort) → wait rollouts → validate → rollback`.

Key flags: `-n/--namespace`, `-p/--port`, `-r/--image-repo`, `--push`, `--no-rollback`.

## How it works for different developers

- **Platform** — push to master → one deploy rolls the shared images to `default` (and any
  namespace running the shared image).
- **Developer preview** — push to `dev-<slug>` (or run `developer.yml` manually) → deploys to an
  isolated `dev-<slug>` namespace on its own port, so multiple developers work in parallel.
- **Teardown** — merging/closing the PR deletes the preview namespace.

## Setup (one-time)

### 1. Push the repo to GitHub

```bash
git remote add origin git@github.com:<owner>/regno-ai.git
git push -u origin master
```

### 2. GitHub Secrets

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN` (a Docker Hub access token)

### 3. Self-hosted runner (on the SYS-GAME-1)

```bash
ssh ubuntu@213.32.7.227
sudo usermod -aG docker ubuntu        # docker build/push without sudo
mkdir -p ~/.kube
sudo sed 's/127.0.0.1/213.32.7.227/g' /etc/rancher/k3s/k3s.yaml > ~/.kube/config
chmod 600 ~/.kube/config

mkdir -p ~/actions-runner && cd ~/actions-runner
curl -o runner.tgz -L https://github.com/actions/runner/releases/latest/download/actions-runner-linux-x64-<VERSION>.tar.gz
tar xzf runner.tgz
./config.sh --url https://github.com/<owner>/regno-ai --token <RUNNER_TOKEN> --labels self-hosted,linux,k3s --unattended
sudo ./svc.sh install && sudo ./svc.sh start
```

> `RUNNER_TOKEN` is generated in GitHub → Settings → Actions → Runners → New self-hosted runner.

### 4. Verify

```bash
# locally: validate the YAML + script
node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/deploy.yml','utf8'))"
bash -n scripts/k8s-deploy.sh
```

## Reproduce / verify

```bash
# manual deploy (same as the action does):
bash scripts/k8s-deploy.sh --namespace default --port 3000 --skip-build

# manual developer preview:
bash scripts/k8s-deploy.sh -n dev-jsmith -p 3010
```
