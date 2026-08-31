# Deployment (k3s)

> Status: stable · Last updated: 2026-08-28

## What it is

The app runs on **k3s** (Kubernetes, single node) on SYS-GAME-1, managed remotely with k9s.

## Why

A cloneable, declarative platform — one k3s namespace per developer is the cloning model.

## How it works

- `k8s/app.yaml` — 7 Deployments + Services + PVCs (web, execution, realtime, mongo, qdrant,
  neo4j, redis) + a `regno-env` Secret.
- Images are built with Docker and used directly (k3s runs the Docker runtime).
- `web` uses `RollingUpdate` (0/1) + a readiness probe, with **no `hostPort`** — it rolls
  zero-downtime. `realtime` keeps `hostPort` + `Recreate`. Preview namespaces re-add a web
  `hostPort` and terminate the old pod before the new one (hostPort can't roll concurrently).
- `migrate-k3s.sh` — creates the Secret from `.env.prod` + applies manifests.
- `seed-k3s.sh` — runs the seed scripts inside the web pod (docs/scripts baked into the image).

## Files involved

- `k8s/app.yaml`
- `migrate-k3s.sh`, `seed-k3s.sh`
- `apps/*/Dockerfile`

## Reproduce / verify

```bash
ssh ubuntu@213.32.7.227
cd ~/regno
sudo kubectl apply -f k8s/app.yaml
bash migrate-k3s.sh      # rebuild Secret + apply
bash seed-k3s.sh         # seed DBs (in-pod)
sudo kubectl get pods    # all Running
k9s                      # remote management (kubeconfig at ~/.kube/config)
```
