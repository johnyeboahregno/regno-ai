# Architect Age & Intelligence

> A gimmick, done properly. The sidebar's **Intelligence** group ends with a small "Architect age"
> widget that shows two horizontal bars — **human years** and **AI years** — each decorated with an
> evolution icon sequence. Clicking it opens a popup with the raw stats, the formula, and the charts
> that prove the numbers.

## Files

| Concern | File |
|---|---|
| Data endpoint | `apps/web/src/routes/api/architect/+server.ts` |
| Shared state | `apps/web/src/lib/architectAge.ts` |
| Sidebar widget | `apps/web/src/lib/ArchitectAgeWidget.svelte` |
| Popup | `apps/web/src/lib/ArchitectAgeModal.svelte` |
| Sidebar wiring | `apps/web/src/lib/Sidebar.svelte` (renders the widget in the Intelligence `section-body`) |
| Shell wiring | `apps/web/src/routes/app/+layout.svelte` (renders the modal at shell level) |
| Icons | `apps/web/src/lib/icons.ts` (`architect-age`, `evo-h-*`, `evo-ai-*`) |

## Endpoint — `GET /api/architect`

Best-effort aggregation (mirrors `api/health` / `api/cortex/health`); always answers `200` with
`ok: true` even if Mongo is down or empty.

Response shape:

```jsonc
{
  "ok": true,
  "bornAt": "2026-08-01T00:00:00.000Z",   // null when no activity recorded yet
  "humanDays": 29,
  "humanYears": 0.08,
  "aiYears": 5.2,
  "multiplier": 65.4,                       // 60 baseline + learning bonus
  "intelligenceScore": 5.4,
  "factors": [                              // formula terms, for the breakdown chart
    { "key": "documents", "label": "Knowledge documents", "value": 332, "weight": 2, "contribution": 11.6 },
    { "key": "patterns",  "label": "Learned patterns",    "value": 82,  "weight": 1.5, "contribution": 6.6 },
    { "key": "memories",  "label": "Memories (facts + wisdom)", "value": 120, "weight": 1.2, "contribution": 5.8 },
    { "key": "executions","label": "Executions run",       "value": 56,  "weight": 1.0, "contribution": 4.0 },
    { "key": "tokens",    "label": "Tokens processed",     "value": 120000, "weight": 0.05, "contribution": 0.6 }
  ],
  "knowledge": [ { "key": "documents", "glyph": "📄", "label": "Documents", "value": 332 }, /* … */ ],
  "usage": {                                 // null when ai_usage is empty/unavailable
    "totals": { "calls": 100, "inputTokens": 0, "outputTokens": 0, "totalTokens": 120000, "cost": 0.12 },
    "byDay":  [ { "day": "2026-08-01", "calls": 3, "totalTokens": 500, "cost": 0.01 } /* 30 entries */ ],
    "byModel": [ { "provider": "openai", "model": "gpt-4o", "calls": 80, "totalTokens": 100000, "cost": 0.1 } ]
  }
}
```

## The formula

**Human years** are real elapsed time:

```
humanYears = (now − bornAt) / 365.25 days
bornAt     = earliest createdAt/ts across cortex_executions, cortex_patterns,
             cortex_agent_memories, cortex_memories, cortex_index, ai_usage
```

**AI years** are the gimmick — an AI "ages" 60× faster than a human, and every thing it learns
makes it age faster:

```
intelligenceScore = Σ ( weight × ln(1 + value) )
                    documents:  2.00   patterns:  1.50   memories:  1.20
                    executions:  1.00   tokens:    0.05
multiplier        = clamp(60 + intelligenceScore, 60, 400)
aiYears           = humanYears × multiplier
```

The `factors[]` array is exactly the Σ terms, so the popup can draw a contribution bar per input.

## Icons

All evolution glyphs are inline SVG in `icons.ts` with `fill="none"` and are rendered by
`Icon.svelte` with `stroke="currentColor"` — so they follow the active theme's CSS variables
(`--signal`, `--signal-2`, `--good`) automatically. No emoji and no hardcoded hex.

| Key | Glyph meaning |
|---|---|
| `architect-age` | hourglass |
| `evo-h-ape` → `evo-h-walker` → `evo-h-astronaut` | human evolution: hunched ape → upright walker → astronaut |
| `evo-ai-abacus` → `evo-ai-terminal` → `evo-ai-robot` → `evo-ai-brain` | AI evolution: abacus → terminal → robot → neural net |

## Behavior notes

- The widget is **not** a route, so it is not in `nav.ts` — it is rendered directly inside the
  Intelligence `section-body` and hides with the section (collapsed sidebar included).
- The popup is rendered at the **shell** level (`+layout.svelte`), outside `.sidebar`, because
  `.sidebar` has `overflow-x: hidden` and would clip a fixed overlay.
- Open/close state is a Svelte store (`architectAgeOpen`); the widget and popup share the fetched
  payload through the `architectAge` store (`refreshArchitectAge()`).
- Empty DB → `bornAt: null`, both ages `0`, popup shows "still waking up" copy.
