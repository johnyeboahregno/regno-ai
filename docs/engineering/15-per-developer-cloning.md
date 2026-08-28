# Per-Developer Cloning

> Status: stable · Last updated: 2026-08-29

## What it is

`clone-developer.sh` provisions a **fresh k3s namespace per developer** — a full copy of the
stack (web, execution, realtime, mongo, qdrant, neo4j, redis) with the base standards + docs
pre-seeded, on a unique web port.

## Why

Clone the whole Regno Architect for each new hire: a base machine that knows the company
standards, which is then pointed at the developer's code to learn their flavour.

## How it works

```
bash clone-developer.sh <slug> <webPort>
  → namespace dev-<slug>
  → Secret (recreated from .env.prod, namespaced)
  → k8s/app.yaml applied with unique hostPorts (web:PORT, realtime:PORT+2)
  → wait web + neo4j pods
  → seed in-pod: init-db (retry), agents, standards, brain
```

The developer's flavour is added after:

```bash
DEVELOPER=<slug> node scripts/seed-history.mjs     # learn their code
regno persona create --slug <slug>-arch --name "<Name>'s Architect" --developer <slug>
```

## Files involved

- `clone-developer.sh`
- `k8s/app.yaml` (namespace-agnostic; hostPorts sed-rewritten per clone)
- `docs/engineering/13-sma-cloning-model.md` (the model this implements)

## Reproduce / verify

```bash
ssh ubuntu@213.32.7.227
cd ~/regno
bash clone-developer.sh jsmith 3010
curl -s http://localhost:3010/api/health     # all services green
sudo kubectl get namespaces                 # dev-jsmith active
```
