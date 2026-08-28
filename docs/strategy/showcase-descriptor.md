# ShowcaseDescriptor — Canonical JSON Format Specification

> One descriptor, many outputs. The ShowcaseDescriptor is a semantic document format
> that captures narrative, quantitative data, relationships, spatial info, and temporal
> sequences. A single JSON descriptor can render into 10+ output formats.

## Architecture: One Descriptor, Many Outputs

```
                         ┌─────────────────────┐
                         │  ShowcaseDescriptor  │
                         │       (JSON)         │
                         └──────────┬──────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
     ┌────────┴────────┐   ┌───────┴───────┐   ┌─────────┴─────────┐
     │   Scene HTML    │   │  Presentation │   │    Markdown       │
     │   (iframes)     │   │   HTML        │   │    (.md)          │
     └─────────────────┘   └───────────────┘   └───────────────────┘
              │                     │                     │
     ┌────────┴────────┐   ┌───────┴───────┐   ┌─────────┴─────────┐
     │   PDF Report    │   │   PPTX Deck   │   │   Data Extract    │
     │   (pdfkit)      │   │   (pptxgenjs) │   │   (JSON)          │
     └─────────────────┘   └───────────────┘   └───────────────────┘
              │                     │                     │
     ┌────────┴────────┐   ┌───────┴───────┐   ┌─────────┴─────────┐
     │  Social Cards   │   │  Accessible   │   │   Chat Context    │
     │  (SVG → PNG)    │   │    HTML       │   │   (plain text)    │
     └─────────────────┘   └───────────────┘   └───────────────────┘
              │                     │
     ┌────────┴────────┐   ┌───────┴───────┐
     │  Infographic    │   │  Descriptor   │
     │  (single-page)  │   │    Diff       │
     └─────────────────┘   └───────────────┘
```

---

## Top-Level Schema

```typescript
interface ShowcaseDescriptor {
  meta: {
    title: string;
    subtitle?: string;
    domain?: string;         // e.g. "finance", "healthcare", "logistics"
    generatedAt: string;     // ISO date
    version: number;
  };
  theme: ThemeConfig;
  scenes: SceneDescriptor[];
  themeAudio?: ThemeAudioConfig;
}
```

### ThemeConfig

```typescript
interface ThemeConfig {
  bg: string;         // Background color (e.g. "#0a0e1a")
  cardBg: string;     // Card/panel background
  border: string;     // Border color
  text: string;       // Primary text color
  textMuted: string;  // Secondary text color
  accent: string;     // Primary accent (cyan: "#06b6d4")
  accentAlt?: string; // Secondary accent (purple: "#8b5cf6")
  fontFamily?: string;
}
```

### SceneDescriptor

```typescript
interface SceneDescriptor {
  id: string;
  title: string;
  narrative?: string;  // Presenter notes / voiceover text
  transition?: 'fade' | 'slide-left' | 'slide-up' | 'zoom';
  duration?: number;   // Seconds (default: 8)
  blocks: Block[];     // Ordered array of typed content blocks
}
```

---

## The 5 Semantic Data Layers

| Layer | Description | Block Types |
|-------|-------------|-------------|
| **Narrative** | Story, context, explanations | `text`, `hero-banner`, `heading`, `alert`, `cta`, `divider` |
| **Quantitative** | Numbers, metrics, data tables | `stat-grid`, `metric-row`, `table`, `chart`, `sparkline`, `progress-ring`, `kpi-strip`, `rough-chart` |
| **Relational** | Connections, hierarchies, flows | `mermaid`, `d3` (force-graph, sankey, treemap, sunburst), `data-flow`, `vs-panel` |
| **Spatial** | Geography, maps, positioning | `d3` (world-map), `app-mockup`, `columns` |
| **Temporal** | Time-based sequences, events | `timeline`, `media-pin`, `audio-clip`, `badge-row` |

---

## All 27 Block Types

### Visual / Narrative

| # | Type | Key Fields | Description |
|---|------|-----------|-------------|
| 1 | `hero-banner` | `title`, `subtitle?`, `stats?[]` | Full-width opening banner with optional stat counters |
| 2 | `heading` | `level` (2\|3\|4), `text` | Section heading |
| 3 | `text` | `content` | Paragraph text, supports `**bold**` and `*italic*` |
| 4 | `alert` | `severity` (info\|warning\|success\|critical), `title?`, `message` | Callout/notice box |
| 5 | `cta` | `headline`, `subtext?`, `buttonLabel?`, `style?` | Call-to-action block |
| 6 | `divider` | `style?` (line\|space\|gradient) | Visual separator |
| 7 | `badge-row` | `badges[]` with `label`, `color?` | Horizontal tag/badge strip |

### Data / Quantitative

| # | Type | Key Fields | Description |
|---|------|-----------|-------------|
| 8 | `stat-grid` | `columns?` (2\|3\|4), `stats[]` with `value`, `label`, `change?`, `color?` | Grid of big-number stats |
| 9 | `metric-row` | `metrics[]` with `icon?`, `label`, `value`, `color?` | Inline metric strip |
| 10 | `table` | `headers[]`, `rows[][]`, `caption?`, `striped?`, `compact?` | Data table (cells can be `string` or `{value, color?}`) |
| 11 | `chart` | `chartType`, `labels[]`, `datasets[]`, `height?` | Chart.js visualization (line\|bar\|doughnut\|horizontalBar\|pie) |
| 12 | `sparkline` | `data[]`, `color?`, `width?`, `height?`, `label?` | Mini inline line chart |
| 13 | `progress-ring` | `value` (0-100), `label`, `size?`, `color?` | Circular progress indicator |
| 14 | `kpi-strip` | `kpis[]` with `label`, `value`, `status` (green\|amber\|red), `trend?` | KPI status indicators |
| 15 | `rough-chart` | `chartType`, `labels[]`, `datasets[]`, `roughness?`, `fillStyle?` | Hand-drawn style chart (Rough.js) |

### Layout / Structure

| # | Type | Key Fields | Description |
|---|------|-----------|-------------|
| 16 | `card-grid` | `columns?` (2\|3\|4), `cards[]` with `icon?`, `title`, `description`, `color?` | Grid of info cards |
| 17 | `icon-grid` | `columns?` (2\|3\|4\|5), `items[]` with `icon?`, `label`, `description?` | Compact icon grid |
| 18 | `columns` | `columns` (2\|3), `content: Block[][]` | Multi-column layout with nested blocks |
| 19 | `app-mockup` | `appName`, `tagline?`, `sidebar?`, `mainContent: Block[]`, `statusBar?` | App UI mockup with sidebar + main area |

### Relational / Flow

| # | Type | Key Fields | Description |
|---|------|-----------|-------------|
| 20 | `mermaid` | `code`, `caption?` | Mermaid.js diagram (flowchart, sequence, etc.) |
| 21 | `d3` | `vizType`, `markers?`, `regions?`, `nodes?`, `links?`, `data?` | D3.js visualization (world-map\|force-graph\|treemap\|sankey\|sunburst) |
| 22 | `data-flow` | `nodes[]` with `id`, `label`, `x`, `y`, `icon?`; `edges[]` | Animated data flow diagram |
| 23 | `vs-panel` | `left`, `right` (each with `title`, `items[]`), `highlight?` | Side-by-side comparison |

### Temporal / Media

| # | Type | Key Fields | Description |
|---|------|-----------|-------------|
| 24 | `timeline` | `events[]` with `date?`, `title`, `description?`, `status?` | Vertical timeline |
| 25 | `audio-clip` | `src`, `title`, `description?`, `waveformColor?`, `duration?` | Audio player with waveform |
| 26 | `media-pin` | `media`, `segments[]`, `height?`, `showWaveform?`, `caption?` | BBC-style scrollytelling media block |
| 27 | `qr-code` | `url`, `size?`, `label?` | QR code generator |

---

## Output Formats — Implementation Tracker

| # | Format | Function / File | Endpoint | Status |
|---|--------|----------------|----------|--------|
| 1 | **Scene HTML** (iframes) | `renderScene()` — ShowcaseRenderer.ts | `?format=scenes` | Done |
| 2 | **Presentation HTML** | `renderPresentation()` — ShowcaseRenderer.ts | `?format=presentation` | Done |
| 3 | **Markdown** | `descriptorToMarkdown()` — ShowcaseMarkdownRenderer.ts | `?format=markdown` | Done |
| 4 | **Data Extract** (JSON) | `descriptorToDataJson()` — ShowcaseDataExtractor.ts | `?format=data` | Done |
| 5 | **Conversational Context** | `descriptorToContext()` — ShowcaseContextRenderer.ts | `?format=context` | Done |
| 6 | **PDF Report** | `descriptorToPdf()` — ShowcasePdfRenderer.ts | `?format=pdf` | Done |
| 7 | **PPTX Slide Deck** | `descriptorToPptx()` — ShowcasePptxRenderer.ts | `?format=pptx` | Done |
| 8 | **Social Cards** | `descriptorToSocialCards()` — ShowcaseSocialRenderer.ts | `?format=social` | Done |
| 9 | **Descriptor Diff** | `descriptorDiff()` — ShowcaseDiffRenderer.ts | `?format=diff&compareWith=ID` | Done |
| 10 | **Accessible HTML** | `descriptorToAccessibleHtml()` — ShowcaseAccessibleRenderer.ts | `?format=accessible` | Done |
| 11 | **Infographic** | `descriptorToInfographic()` — ShowcaseInfographicRenderer.ts | `?format=infographic` | Done |

---

## API Endpoint

```
GET /api/lab/showcases/[showcaseId]/render?format=<format>

Formats:
  scenes         → application/json (ShowcaseScene[])
  presentation   → text/html (single-page slideshow)
  markdown       → text/markdown (download)
  data           → application/json (extracted datasets)
  context        → text/plain (LLM-friendly summary)
  pdf            → application/pdf (download)
  pptx           → application/vnd...presentationml.presentation (download)
  social         → application/json (base64 PNG images)
  diff           → application/json (requires &compareWith=<id>)
  accessible     → text/html (semantic + ARIA)
  infographic    → text/html (single-page visual summary)
```

---

## Developer Toolbar

The ShowcaseCard component provides a dropdown export menu for developers (`isDeveloper: true`).
Regular users see a single HTML export button (unchanged).

Developer menu options:
- HTML Presentation
- Markdown (.md)
- PDF Report (.pdf)
- PowerPoint (.pptx)
- Data Extract (.json)
- Social Cards
- Accessible HTML
- Infographic
- Chat Context (.txt)
- Version Diff (when comparable versions exist)

---

## File Map

| File | Role |
|------|------|
| `src/lib/server/cortex-flow/services/ShowcaseDescriptor.ts` | Type definitions (27 block types) |
| `src/lib/server/cortex-flow/services/ShowcaseRenderer.ts` | Core render engine (scene HTML, presentation HTML, scenes) |
| `src/lib/server/cortex-flow/services/ShowcaseMarkdownRenderer.ts` | GFM Markdown export |
| `src/lib/server/cortex-flow/services/ShowcaseDataExtractor.ts` | Quantitative data extraction to JSON |
| `src/lib/server/cortex-flow/services/ShowcaseContextRenderer.ts` | LLM-friendly plain text export |
| `src/lib/server/cortex-flow/services/ShowcaseAccessibleRenderer.ts` | Semantic accessible HTML with ARIA |
| `src/lib/server/cortex-flow/services/ShowcaseInfographicRenderer.ts` | Single-page visual summary |
| `src/lib/server/cortex-flow/services/ShowcasePdfRenderer.ts` | PDF report via pdfkit |
| `src/lib/server/cortex-flow/services/ShowcasePptxRenderer.ts` | PPTX slide deck via pptxgenjs |
| `src/lib/server/cortex-flow/services/ShowcaseSocialRenderer.ts` | Social media cards (SVG→PNG via sharp) |
| `src/lib/server/cortex-flow/services/ShowcaseDiffRenderer.ts` | Descriptor comparison engine |
| `src/routes/api/lab/showcases/[showcaseId]/render/+server.ts` | API endpoint (all 11 formats) |
| `src/lib/components/showcase/ShowcaseCard.svelte` | Developer export dropdown UI |
