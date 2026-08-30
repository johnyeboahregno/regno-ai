# Architect Brain Model (base knowledge + own brain)

> Status: corrected · Last updated: 2026-08-30

> Correction (2026-08-30): there is **one** architect — the whole application — with **one** brain.
> What this doc described as "each architect = a new stack with its own brain" is now the **SMA**
> concept, but SMAs are *not* new stacks: they are selectable expert profiles that **center** the
> shared knowledge on a focus area. See [`20-sma-subject-matter-experts.md`](./20-sma-subject-matter-experts.md).
> The multi-stack "own brain" model only applies when you deploy a whole new copy of the repo
> (see [`15-per-developer-cloning.md`](./15-per-developer-cloning.md)).

## What it was

Each **Regno Architect** was a **complete new stack** — a k3s namespace with its **own brain**
(MongoDB + Qdrant + Neo4j) — plus a **read-only connection to the shared base knowledge**.

## Why

Brain-per-architect isolation: every architect has its own context, docs, and knowledge, and
learns independently — while still being able to draw on the shared base (docs + standards).

## How it works

```mermaid
flowchart TD
    BASE["Base platform (default ns)<br/>shared: docs + standards"]
    A["Architect A (dev-<slug> ns)<br/>own Mongo/Qdrant/Neo4j"]
    BASE -. "BASE_QDRANT_URL (read-only)" .-> A
```

- **Own brain** — `spawn-agent.mjs` applies `k8s/app.yaml` into the architect's namespace, so it
  gets its own databases (Mongo, Qdrant, Neo4j, Redis) with no shared state.
- **Base connection** — the spawner injects `BASE_QDRANT_URL=http://qdrant.default.svc.cluster.local:6333`
  into the architect's Secret (cross-namespace, read-only).
- **Search** — `POST /api/nexus/search` queries the architect's **own** Qdrant *and* the **base**
  Qdrant, merges, dedupes, and tags each result `source: 'own' | 'base'`.
- **Learning + serving (2026-08-30)** — each architect's own brain also powers **Recall & Serve**
  (`docs/architecture/RECALL_SERVE_DECISION_LAYER.md`): executions write wisdom tagged with the
  architect's `agentSlug`/`developer`, and the orchestrator serves high-confidence matches from
  that architect's own `cortex_wisdom` instead of calling the LLM. Base knowledge is read-only;
  learned flavour is architect-scoped.

## Files involved

- `scripts/spawn-agent.mjs` — injects `BASE_QDRANT_URL`
- `apps/web/src/routes/api/nexus/search/+server.ts` — own + base search
- `apps/web/src/routes/app/agents/+page.svelte` — "Regno Architects" admin screen
- `k8s/app.yaml` — the full stack per namespace

## Reproduce / verify

```bash
# spawn an architect, then check its search hits both stores:
WPOD=$(sudo kubectl get pods -l app=web -o jsonpath='{.items[0].metadata.name}')
sudo kubectl exec "$WPOD" -- node scripts/spawn-agent.mjs godemo 3300
# in the new namespace, POST /api/nexus/search → results tagged own|base
```
