# Data Visualization Nodes

The data management canvas now ships with two server-rendered visualization nodes that accept JSON or CSV payloads from upstream sources. Both nodes run entirely inside the pipeline execution sandbox; the client only receives trimmed preview state for rendering.

## Data Grid Node (`data-grid`)

The grid node profiles incoming records and exposes an interactive spreadsheet-like preview on the canvas.

### Server behaviour

- Detects JSON arrays/objects or CSV blobs (auto, JSON-only, or CSV-only modes).
- Flattens nested objects up to a configurable depth to guard against runaway schemas.
- Caps analytics to sensible limits (default 5k rows / 250 columns) and records truncation warnings.
- Computes per-column summaries (type inference, min/max/mean, categorical frequencies, sample values) that power tooltips and profiling cards in the UI.
- Stores preview state (`gridState`) on the node config so replays remain server authoritative.

### Configuration options

| Setting | Description |
| --- | --- |
| `dataFormat` | Force JSON/CSV parsing or auto-detect between them. |
| `flattenObjects` | Enable dot-notation flattening of nested documents. |
| `csvDelimiter` / `csvHasHeader` | CSV parsing controls when ingesting strings. |
| `maxAnalysisRows` / `maxColumns` | Hard limits for profiling workload. |
| `maxFieldDepth` | Depth for object flattening. |
| `maxPreviewRows` | Row budget sent to the client-side table. |
| `fieldSampleSize` | Number of values sampled for tooltips and summaries. |

## Chart Node (`chart`)

Produces aggregated chart data for common visual encodings (bar, line, area, scatter, pie).

### Server behaviour

- Shares the same normalization pipeline as the grid node, including CSV parsing and object flattening.
- Auto-infers x-axis, group, and numeric series when the user does not specify them.
- Supports `sum`, `avg`, and `count` aggregations with safeguards on maximum series/points to keep payload sizes manageable.
- Captures series statistics (min/max/mean) and assigns palette colours server-side; the client only renders the prepared state.
- Writes preview metadata to `chartState` so the UI can remain stateless.

### Configuration options

| Setting | Description |
| --- | --- |
| `chartType` | One of `bar`, `line`, `area`, `scatter`, or `pie`. |
| `aggregation` | `sum`, `avg`, or `count` aggregation for measures. |
| `xField` / `groupField` | Optional dimension fields; auto-selected when omitted. |
| `yFields` | Array of measures for series generation (pie restricts to one). |
| `maxSeries` / `maxPoints` | Guards against oversized charts. |
| `dataFormat`, `csvDelimiter`, `csvHasHeader`, `flattenObjects` | Parsing controls shared with the grid node. |

## Operational notes

- Both nodes honour the node mode tri-state (`enabled`, `init`, `disabled`) used across the canvas and integrate with pipeline pause/resume semantics.
- Preview state is cleared automatically on pipeline reset or node stop to prevent stale data leaks.
- The UI components live under `src/lib/components/node-displays/` and only consume the sanitized `gridState` / `chartState` payloads.
- Configuration modals reuse the shared `DynamicModalSection` registry (`DataGridConfigSection` and `ChartConfigSection`).

Run a pipeline after adjusting settings to regenerate the server-side preview data. The client does not attempt to re-parse raw payloads, maintaining the invariant that all heavy processing stays within the backend execution environment.
