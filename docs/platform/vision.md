# VISION — the living narration layer for Regno.ai

> Status: **planned** (design locked 2026-07-12). Nothing built yet — every section
> below is the spec to build against; mark items built-vs-planned as they land.

## The problem it solves

Regno.ai has enormous surface area — dozens of areas (NEXUS, Docs, GENESIS, CORTEX,
STAGE, CMS, F1, Cortex Flow, Labs, Analytics, Operations…), each with several tabs. Every
area is *implemented* (the "how"), but a non-technical investor/customer sees mechanism,
not meaning — and "we use LLMs + orchestration + grounding" sounds like everyone's deck.

**VISION** is the translation layer: on any area, it narrates *what it is · what it gives
you · why it matters · and the kicker — why this runs on Regno rather than wiring
Claude/Gemini/an LLM yourself.* Hand an investor a link in **narration mode** and they get
the vision by walking the product, without technical exposure.

**The meta-point (the moat, demonstrated):** VISION narrates the platform by *grounding in
the platform's own code + decisions* and *re-narrating as it evolves*. It **is** the proof
of the grounded-self-aware-substrate thesis — you're not describing the moat, you're
standing inside it. (See MEMORY `project_grounding_substrate_usp`, `project_wage_bill_thesis`.)

## Decisions (locked)

- **Living engine:** grounded LLM generation + human pin/override (not hand-authored, not
  static). Cached & versioned; re-narrated on change.
- **Coverage:** *every* area, on demand. Pre-seed flagships (~80%); a **✨ generate** button
  in the console lets an `app.development` user generate a vision for the current area on the
  spot (same pattern as STUDIO-AUDIO). The long tail fills as devs visit areas.
- **UX:** one engine, two skins. Opened by an **always-on ✨ icon (top-left)** or the **F2 key**
  (superseded the original Cmd-V/Cmd-N chord — a plain function key never touches copy/paste).
  Any surface can also open VISION for an arbitrary area by dispatching
  `window.dispatchEvent(new CustomEvent('regno:open-vision', { detail: { area, context } }))`.
  - **Dev skin** (`app.development`): read + **✨ generate** + **pin**, with the dev tag.
  - **Vision skin** (`app.vision` only): a clean, branded slide-over (regno house style) — no
    debug chrome. The live feature stays visible beside it.
- **The universe** (`/universe`, the "Regno.ai" tile): a force-directed constellation of every
  concept/module/surface (`src/routes/universe/+page.svelte`). Clicking any node dispatches the
  `regno:open-vision` event → the console narrates that node, grounded in its blurb. This is the
  investor artifact — one screen exposes the whole platform, VISION on click. Nodes carry plain
  **value labels** (WS0) with the technical name as a card subtitle; wheel/drag zoom + pan.
- **Audience lenses** — one map, three depths, tiered per node: **"What is Regno.ai"** (the
  essentials — substrate + core value + marquee capabilities), **"The full platform"** (adds the
  apps: CMS, F1, Chat, Labs, SDK), **"Under the hood"** (every pattern + deep concept). Default
  follows the viewer: logged-out → essentials, signed-in → full platform, dev → under the hood;
  the guided tour bumps to at least the app layer. The physics + render filter to the active lens.
- **Role:** new `app.vision`. Gate = `hasRole('app.vision') || hasRole('app.development')`.
  Skin = dev if `app.development`, else vision. Dev implies vision.
- **v1 scope:** 5–6 flagship areas narrated deeply (platform overview, CMS, Cortex, Cortex
  Flow, F1, Labs) end-to-end, incl. the kicker + investor mode; ✨ covers everything else.

## Narration template (every area, consistent — so it always lands)

1. **What it is** — one plain sentence.
2. **What it gives you** — the outcome in the reader's terms (not features).
3. **Why it matters** — the feature list *as capabilities*.
4. **The kicker (mandatory):** *"LLMs exist. Claude Code exists. Gemini exists — here's why
   this runs on Regno, not a raw model"* — grounded, governed, orchestrated, on your own
   substrate, with the audit trail + data flywheel. The thread that turns a tour into a thesis.

## Architecture (planned — real paths)

**Area identity.** An `area` = a stable id derived from the route + `appRegistry` + tab
(e.g. `cortex`, `cortex:knowledge`, `cms:reports`, `lab:launchpad`). A small resolver maps
`page.url` → areaId + display metadata + the code paths / insights refs to ground on.

**Storage.** `vision_narrations` collection (platform DB):
```
{ area, version, contentHash, status:'generating'|'ready'|'failed',
  narrative: { lead, whyItMatters:[…], analogy, kicker, short:{…same…} },
  pinned?: boolean, model, sources:[…], generatedAt, error? }
```
`contentHash` = hash of the area's grounding inputs (source summary + insights) → cache key
& staleness signal.

**Narrative shape v2 (2026-07-14).** The narrative is now **four humanised beats**
(`src/lib/server/services/visionService.ts` `SYSTEM`, `VisionBeats`):
`lead` (what it is + what it gives, merged, outcome-first) · `whyItMatters[]` · `analogy`
(the "Think of it like…" picture flowing into an in-practice example) · `kicker`. Each also
has a terse `short` variant (Mini). The shown/spoken headings are **"Why this helps"**,
**"Think of it like"**, **"Why Regno is smarter"** (`narrativeToSpeech` announces them).
`normalizeBeats` (`visionExport.ts`) bridges legacy 6-beat docs forward; a `PROMPT_VERSION`
constant folded into the source hash invalidates the cache on prompt changes (pinned docs
flag stale for a force reseed, unpinned re-narrate on the freshness sweep). The voice was
de-AI'd after customer feedback ("too AI") — a SOUND-LIKE-A-PERSON block bans the AI tells.

**Full ↔ Mini toggle.** `src/lib/stores/visionView.svelte.ts` (`mini` state, localStorage) is
shared by the scenario card, journey, node popup and console; each stores the whole narration
and `visionView.pick()` returns detailed-vs-`short` at render, so a flip on ANY slide sticks
everywhere. Journeys carry their own `introShort`/`beatShort`/`conclusionShort` (both planners
in `visionJourney.ts`).

**Scenario domain-grounding.** A "Show me" walkthrough no longer shows the generic cached
per-node narration (domain-blind). Each step fetches `/api/vision/scenario-beats` →
`narrateForScenario(area, scenario)` (non-cached): the VISION prompt with the user's scenario
threaded in, instructing the model to ground the analogy + example in the query's own industry.
The model infers the domain from the query text (no hardcoded industry list).

**Generation (grounded).** A generator resolves grounding for the area — the `insights/`
corpus (GLOSSARY/DECISIONS via `RepoGrounding`) + area metadata — and prompts the LLM (via
the existing credential path: `getBestCredentialForProvider` + Anthropic/OpenAI, the same
route STUDIO-AUDIO / parse-intent use) to fill the template. Cached in `vision_narrations`.
Background / fire-and-forget so the ✨ click returns immediately; poll for status. (Rule 10:
grounds before it generates; refuses to invent — surfaces "couldn't ground this area" rather
than fabricating.)

**Freshness (living).** Stamp each narration with the git hash + insights hash it was
generated from. When an area's source or insights change (tie into the existing
`insights-sync-check` daily task), mark affected narrations stale → re-narrate in the
background. Pinned narrations survive regeneration until unpinned (LLM drafts, humans polish,
platform keeps it fresh).

**API (planned):**
- `POST /api/vision/[area]` — generate/regenerate (gate `app.development`). Fire-and-forget, 202.
- `GET  /api/vision/[area]` — read narration + status (gate `app.vision`).
- `POST /api/vision/[area]/pin` — pin/unpin a curated narration (gate `app.development`).

**UI (built):**
- `VisionConsole.svelte` — the engine, route-aware; renders the 4-beat narrative via the shared
  `VisionNarrative.svelte`. Opened by the always-on ✨ icon (bottom-left) or F2. Two skins
  (dev = ✨ generate + pin; vision-only = clean slide-over). Reacts to the `regno:open-vision` event.
- **The universe** (`/universe`) — a force-directed constellation of every area; click a node → VISION.
- **Investor / narration mode (built):** minted, expiring **invite tokens** (`vision_invites`).
  A dev mints one from the universe ("Share narration link"); the link `/universe?invite=<token>`
  sets an httpOnly `vision_tour` cookie and enters chrome-free tour mode. A guest reads narrations
  inline via the cookie-gated, **view-only** `/api/vision/guest/[area]` — no platform role, no other
  access (scoped narrowly on purpose). **Guided tour (DONE):** in narration mode the universe
  auto-walks the flagship areas hands-free (Play/Pause, Prev/Next, N/6), narrating each inline —
  a self-running investor demo. Remaining polish: deeper grounding (full agentic RepoGrounding
  loop vs the current insights-slice).

## Build increments

1. **Engine + role:** `app.vision` role — DONE. Added to the `UserRole` union (roles.ts/.d.ts) and
   seeded into Mongo (`scripts/seed-vision-role.ts`: role "Vision (Narration)" + `vision.read`
   privilege) so an admin can assign narration-only access to a persistent account. `app.development`
   / `app.administration` already grant access at the endpoint level (OR'd in), so a dev needs no
   explicit assignment. Plus `visionService.ts` (resolve, grounded generate, cache, pin) + the endpoints.
2. **Console UI:** Cmd-N `VisionConsole`, dev skin (tab in debug console) with ✨ + pin,
   vision skin (slide-over). Route-aware.
3. **Flagship seed + investor mode:** narration-mode invite tokens + chrome-free tour + shareable
   link + guest view-only read endpoint — DONE. Pre-generating/curating the hero areas is the
   remaining curation task (the ✨ covers on-demand).
4. **Freshness (DONE):** each narration is stamped with a `sourceHash` = hash(area seed + `insights/`
   corpus). The daily `insights-sync-check` (ScheduledWorker) calls `checkVisionFreshness()`:
   mismatched narrations go **stale** — unpinned ones re-narrate (capped at 10/run, overflow logged,
   not silent), pinned ones are flagged `stale:true` for human review (never auto-overwritten). The
   console shows a stale banner. Generation now also grounds in a slice of the insights corpus, so a
   re-narration reflects the change. Remaining: the full agentic RepoGrounding loop (deeper grounding).

## Honest risks

- **Auto-marketing reads generic** → strong template + ground in *specifics* (real module
  names/numbers) + human pin for flagships. Never ship raw model prose unreviewed for heroes.
- **Freshness must be event-driven** (git/insights hash), not "regenerate nightly" (cost).
- **Grounding depth** — v1 grounds on `insights/` + area metadata (not the full agentic
  RepoGrounding loop) to stay buildable; deepen later.

## Relationship to existing work

- Reuses the **STUDIO-AUDIO** pattern (generate button → background → cache → status/badge).
- Reuses the **credential resolver** (`getBestCredentialForProvider`) and the **debug console**
  (`DeveloperDebugPanel`) as the dev-skin host.
- Dogfoods **`insights/`** + `RepoGrounding` — the grounding substrate narrating itself.
