# Regno.ai Capability Radar — self-aware + world-aware

**Updated: 2026-07-12**

## Why this exists

The Regno.ai universe / VISION must sell the *entire* concept — **now and as it grows** — and stay
**ahead of the curve** as AI practice evolves exponentially. Hand-maintaining that is impossible:
we kept discovering capabilities only when someone asked. The Capability Radar makes it systematic.

It has two probes and a loop:

```
  INWARD  ── discover-capabilities ──►  what we HAVE but haven't surfaced
  OUTWARD ── ai-landscape-probe    ──►  what's EMERGING that we should add
                        │
                        ▼
        gap ──► AICAP registry ──► build (programme) ──► surface on the universe ──► VISION narrates
                        ▲                                                                    │
                        └──────────────────  the loop stays honest & current  ◄─────────────┘
```

## The two probes (built)

### Inward — `scripts/discover-capabilities.ts`
Scans agent tools + services + the insights glossary **+ UI surfaces (routes, apps from the registry,
admin tabs)** and reports every capability whose source name does **not** appear in the universe map data (ids + labels + blurbs). Because blurbs cite the real
service, a miss is a strong "not surfaced yet" signal.
- `npx tsx scripts/discover-capabilities.ts` → the delta to curate in.
- Over-reports plumbing on purpose (a human filters — a discovery *aid*, not an oracle). NOISE/GENERIC
  filters cut the obvious persistence/credential/chart-internal noise.

### Outward — `scripts/ai-landscape-probe.ts`
Holds a **reference taxonomy** of modern AI practice (grounded in `doc/anthropic/` + established best
practice) and scores regno.ai's coverage of each — `have` / `partial` / `gap` — against the map + the
codebase.
- `npx tsx scripts/ai-landscape-probe.ts` → coverage % + the specific gaps to augment.
- **2026-07-12 baseline: 90% (39 have · 3 partial · 3 gap of 45).** Gaps to stay ahead: model
  routing/fallback, DSPy prompt-optimization, MCP, Agent Skills, computer use, observability/tracing.

## The ruleset (grounding & classification)

1. **Every surfaced capability ties to a real path/service** (rule 10 — refuse to invent). If it's a
   design doc with no implementation (MCP, Skills, Memory tool, DSPy today), it is **not** shown as
   built. It may be shown as **planned/building** — but never as done.
2. **Status is honest**: `built` · `partial` (real but evolving) · `planned` (designed, not yet). The
   map may show `partial`/`planned` nodes in a visually distinct state so we can sell the *roadmap*
   without overclaiming.
3. **Classification**: each capability gets a `group` (substrate/knowledge/orchestration/pattern/apps),
   a `tier` (1 essentials · 2 under-the-hood · 3 apps), and a plain **value label** (WS0 — non-technical).
4. **Curation, not automation-only**: the probes propose; a human confirms the value label + tier +
   grounding. Discovery is an aid; the map stays deliberate.

## The programme — build the gaps (don't just list them)

The gaps the outward probe finds become **AICAP** tickets and get **built to a baseline** — best-practice,
not necessarily perfect on day one — then tracked and enhanced in real time, and surfaced with honest
status. Current gap → ticket mapping:

| Gap (from probe) | Ticket | Build note |
|---|---|---|
| Prompt caching | AICAP.CACHE | ✅ done (agent-loop tools+system cached) |
| MCP | AICAP.MCP | ✅ ALREADY BUILT (`src/lib/server/mcp/` — discovery, guardian, registry, server bridge) — was a false gap; probe corrected |
| Agent Skills | AICAP.SKILLS | 🟡 partial (`SkillExporter`) — extend to composable load |
| Long-term memory tool | AICAP.MEMORY | ✅ baseline built (`MemoryTool` remember/recall/forget over agent_memories) |
| Prompt optimization (DSPy) | AICAP.METAPROMPT | auto prompt-improve pass on PlanEngine |
| Model routing / fallback | AICAP.ROUTING | difficulty→model + fallback |
| Observability / tracing | AICAP.TRACE | per-run spans + token/cost |
| Computer use | (new) AICAP.COMPUTER | gated computer-use tool for the agent runtime |
| Batch API | AICAP.BATCH | cost-optimised bulk jobs |

## Built vs planned

- **Built:** both probe scripts + this ruleset (91% coverage); **the live edge** — `capabilityRadar.ts`
  (`scanLandscape` uses Anthropic web search to discover emerging techniques, flags the novel ones vs
  the code/map corpus, persists to `capability_radar_findings`), a **weekly scheduled scan**
  (`capability-radar-scan`, Monday 06:00 UTC — ScheduledWorker + worker-entry boot), the CLI
  `scripts/radar-scan.ts`, and endpoints `GET /api/radar/findings` + `POST /api/radar/scan` (dev).
  Store verified (persist + dedupe + read). A live scan needs the execution server + web access.
- **Emerging ring (built):** the universe shows radar findings as a distinct dashed **amber outer
  orbit** — "on the radar, NOT built" (honest, rule 10). Dev-only (findings endpoint is gated),
  toggled via "◎ Radar (N)"; clicking a node shows the technique + source + an explicit "not built
  yet" note. Sells *what's coming next* without overclaiming.
- **Planned:** (1) tie a newly-*built* capability into VISION freshness so it auto-narrates;
  (2) auto-append confirmed novel techniques into the outward probe's taxonomy; (3) optionally
  open the emerging ring to investors (a curated roadmap view).

## Related

- `doc/platform/anthropic-alignment.md` — the original gap analysis this systematises.
- `doc/platform/vision.md` — the universe/VISION the radar keeps complete.
- `doc/platform-todo-registry.md` §9 (AICAP) — the tracked programme.
