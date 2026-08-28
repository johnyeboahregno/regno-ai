# VISION-enable everything — the plan

**Updated: 2026-07-12** · Status: PLAN (no scale generation yet, per decision)

## The real shape of regno.ai (`scripts/vision-inventory.ts`)

| Surface | Count |
|---|---:|
| Svelte components | **654** (in 141 feature areas) |
| Services | **412** |
| Agent tools | 31 |
| Top-level routes | 42 |
| API endpoints | **823** |
| **Total surfaces** | **1,962** |

Biggest feature areas by components: CMS (105), Cortex Flow (104), modal-sections (84), Admin (50),
STAGE (44), common (34), canvas (25).

So "vision-enable everything" is ~2,000 surfaces — not 120 nodes. The universe map's 120 nodes are
the *feature headlines*; beneath them are hundreds of components and 823 endpoints.

## Cost is NOT the blocker — signal is

At the fast model (~$0.004/narration):
- **Feature-level (~214)** → ~$0.86 · ~8 min
- **Tiered (features + key services, ~626)** → ~$2.50 · ~21 min
- **Everything (~1,920)** → ~$7.68 · ~64 min

Even "everything" is ~$8. The real question is **noise**: a VISION for `GeminiSettings.svelte` or a
trivial modal adds nothing. The value is at the **feature** level + the **links between features**.

## The approach — 4 phases (each grounded, rule 10)

1. **Enumerate & classify** *(built: `vision-inventory.ts` + `discover-capabilities.ts`)* — the full
   inventory, grouped into features, signal-vs-plumbing classified.
2. **Vision-enable** — batch-generate a VISION per FEATURE (reuse `visionService.generateVision`,
   grounded in the feature's real components/blurb; cached). Mechanism proven by the running 120-node
   seed (`seed-all-node-visions.ts`) — scales the same way.
3. **Stories & links** *(to build)* — the valuable, novel part: for each feature, generate
   "**how it works · how it connects to X, Y · what value it adds**". The universe *edges* already
   encode the connections; this narrates them. Output: a per-feature story + a linked narrative graph.
4. **Living** — tie to freshness (regenerate a feature's VISION when its code changes, via the
   insights/git hash) + surface at finer granularity (drill from a node into its components).

## Recommendation

**Feature-level first** (~$0.86, 8 min) — the ~214 sellable feature stories + the linking mechanism
(phase 3), which is where the differentiated value is. Then deepen to *tiered* or *everything* only
where it earns its keep (cost is trivial; noise is the cost). Generate on a curated allow-list, not
a blind sweep of all 654 components.

## Built vs to-build

- **Built:** the inventory scanner, the discovery classifier, the per-node VISION seeder, the VISION
  engine + freshness.
- **To build:** the feature-grouping → VISION generator at feature granularity, and the **stories &
  links generator** (phase 3) — the genuinely new piece.

## Related
- `doc/platform/vision.md`, `doc/platform/capability-radar.md`, `doc/platform-todo-registry.md` (VISION-COVERAGE).
