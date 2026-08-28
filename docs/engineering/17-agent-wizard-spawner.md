# Agent Wizard & Spawner

> Status: stable · Last updated: 2026-08-29

## What it is

An admin UI (`/app/agents`) to create specialist architect agents. Each agent gets a name,
a set of technologies (whose best-practice standards are compiled into the agent), optional repo
connections and data sources — and a **fresh k3s namespace** running the full stack.

## Why

Turn the SMA cloning model into a product: "this architect is a Go developer", "this one is a
Rust developer", or combine technologies — each backed by the best-practice standards for that stack.

## How it works

```
POST /api/agents { name, technologies[], repos[], datasources[] }
  → slugify(name) → namespace dev-<slug>, port 3100 + n*10
  → register in `agents` collection (status: spawning)
  → create `cortex_agents` entry (technologies drive injected standards)
  → spawn node scripts/spawn-agent.mjs (detached) →
       kubectl: namespace → copy regno-env secret → apply k8s/app.yaml (unique hostPort)
       → seed init-db, agents, standards, brain → status: ready
```

- Standards injection: `buildContext` injects **general** standards always + **technology**
  standards matching the agent's `technologies`.
- `GET /api/technologies` returns the tech catalog (web-typescript, go, rust, python, ros).

## Files involved

- `apps/web/src/routes/app/agents/+page.svelte` — the wizard
- `apps/web/src/routes/api/agents/+server.ts`, `api/technologies/+server.ts`
- `scripts/spawn-agent.mjs` — namespace spawner (runs in the web pod)
- `k8s/rbac.yaml` — ClusterRole `agent-spawner` for the web pod
- `packages/flow/src/{types,context,orchestrator}.ts` — per-agent tech standards
- `standards/technologies/*.md` — the per-language best-practice standards

## Reproduce / verify

```bash
# via the UI: /app/agents → create agent
# or directly test the spawner:
WPOD=$(sudo kubectl get pods -l app=web -o jsonpath='{.items[0].metadata.name}')
sudo kubectl exec "$WPOD" -- node scripts/spawn-agent.mjs goapi 3200
curl -s http://localhost:3200/api/health     # all green
```
