# Deep Knowledge Research Pipeline V3

## Quality-Gated Streaming Architecture

**Version**: 3.0
**Created**: January 2026
**Pipeline ID**: `knowledge-ingestion-v3`

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Pipeline Flow](#pipeline-flow)
4. [Node Configuration](#node-configuration)
5. [Quality Scoring System](#quality-scoring-system)
6. [Re-Enrichment Loop](#re-enrichment-loop)
7. [Resilience Features](#resilience-features)
8. [Usage Guide](#usage-guide)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The Deep Knowledge Research Pipeline V3 is a redesigned knowledge ingestion system with **per-record checkpointing** and **quality-based routing** for maximum resilience.

### Key Improvements over V2

| Feature | V2 (Linear) | V3 (Quality-Gated) |
|---------|-------------|-------------------|
| Checkpoints | 1 (end) | 3 (raw, enriched, retry) |
| Failure Recovery | Restart from scratch | Resume from last checkpoint |
| Quality Routing | None | Auto-route by score |
| Re-enrichment | Manual | Automatic LLM loop |
| Per-record Processing | No | Yes |

### Design Principles

1. **Never Lose Data**: Raw content is checkpointed immediately after fetch
2. **Quality Over Speed**: Content is scored and routed based on quality
3. **Automatic Recovery**: Low-scoring content is automatically re-enriched
4. **Streaming Architecture**: Each record is processed independently

---

## Architecture

```
╔════════════════════════════════════════════════════════════════════════════╗
║                    QUALITY-GATED STREAMING ARCHITECTURE                    ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  ┌─────────────┐     ┌──────────────┐     ┌─────────────────────────────┐  ║
║  │  Knowledge  │ ──► │  Stage(Raw)  │ ──► │      Expert Analysis        │  ║
║  │   Source    │     │  checkpoint  │     │  Chain (4 specialists)      │  ║
║  └─────────────┘     └──────────────┘     └──────────────┬──────────────┘  ║
║        │                    │                            │                 ║
║      fetch             checkpoint #1                 analysis              ║
║                       (never lose                        │                 ║
║                        raw content)                      ▼                 ║
║                                              ┌─────────────────────────┐   ║
║                                              │   Stage(Enriched)       │   ║
║                                              │   checkpoint #2         │   ║
║                                              │   + quality scoring     │   ║
║                                              └───────────┬─────────────┘   ║
║                                                          │                 ║
║                                              ┌───────────┴───────────┐     ║
║                                              │    Quality Router     │     ║
║                                              │      (Switch)         │     ║
║                                              └───────────┬───────────┘     ║
║                            ┌─────────────────────────────┼─────────────┐   ║
║                            │                             │             │   ║
║                            ▼                             ▼             ▼   ║
║                       Score ≥80                    Score 50-79    Score <50║
║                       (Pass)                      (Re-enrich)    (Review)  ║
║                            │                             │             │   ║
║                            │                             ▼             │   ║
║                            │                   ┌─────────────────┐     │   ║
║                            │                   │ Re-Enrichment   │     │   ║
║                            │                   │    Expert       │     │   ║
║                            │                   └────────┬────────┘     │   ║
║                            │                            │              │   ║
║                            │                            ▼              │   ║
║                            │                   ┌─────────────────┐     │   ║
║                            │                   │  Stage(Retry)   │     │   ║
║                            │                   │  checkpoint #3  │     │   ║
║                            │                   └────────┬────────┘     │   ║
║                            │                            │              │   ║
║                            └──────────────┬─────────────┴──────────────┘   ║
║                                           │                                ║
║                                           ▼                                ║
║                                    ┌─────────────┐                         ║
║                                    │   Merge     │                         ║
║                                    │  (combine)  │                         ║
║                                    └──────┬──────┘                         ║
║                                           │                                ║
║                                           ▼                                ║
║                              ┌────────────────────────┐                    ║
║                              │    Cortex Memories     │                    ║
║                              │  MongoDB + Neo4j +     │                    ║
║                              │       Qdrant           │                    ║
║                              └────────────────────────┘                    ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
```

---

## Pipeline Flow

### Stage 1: Knowledge Source (Trigger)
```yaml
Node ID: source
Type: knowledge-source
Purpose: Fetch content from URL/file/API/manual input
Output: Raw content with title, markdown, URL
```

### Stage 2: Stage Raw (Checkpoint #1)
```yaml
Node ID: stage-raw
Type: knowledge-staging
Purpose: Immediately checkpoint raw content
Mode: stage (no quality evaluation)
Resilience: Content survives any downstream failure
```

### Stages 3-6: Expert Analysis Chain
```yaml
3. structure-analyst  - Organization and hierarchy analysis
4. content-analyzer   - Products, services, features extraction
5. terminology        - Domain vocabulary extraction
6. entity-mapper      - Knowledge graph entities and relationships
```

### Stage 7: Stage Enriched (Checkpoint #2)
```yaml
Node ID: stage-enriched
Type: knowledge-staging
Purpose: Score enriched content across 5 dimensions
Mode: stage with quality evaluation
Output: Content + stagingScore field
```

### Stage 8: Quality Router
```yaml
Node ID: quality-router
Type: switch
Purpose: Route based on quality score
Routes:
  - high-quality (≥80) → Direct to Merge
  - re-enrich (50-79) → Re-enrichment Expert
  - review (<50) → Flagged, then to Merge
```

### Stage 9a-b: Re-Enrichment Path
```yaml
9a. re-enrichment - LLM enhancement for weak content
9b. stage-retry   - Checkpoint after re-enrichment (lower threshold)
```

### Stage 10: Merge
```yaml
Node ID: merge
Type: merge
Purpose: Combine all routing paths
Mode: concat with URL deduplication
```

### Stage 11: Cortex Memories
```yaml
Node ID: memories
Type: memories
Purpose: Multi-backend storage
Backends: MongoDB + Neo4j + Qdrant
```

---

## Node Configuration

### Knowledge Staging Nodes

Three staging nodes with different purposes:

#### Stage Raw (Checkpoint #1)
```javascript
{
  mode: 'stage',
  reviewAction: 'skip',        // Don't evaluate quality
  promoteThreshold: 100,       // Never auto-promote
  reEnrichThreshold: 0,        // Don't flag for re-enrichment
  compressContent: true,       // Smart compression >10KB
  ttlDays: 30                  // 30-day recovery window
}
```

#### Stage Enriched (Checkpoint #2)
```javascript
{
  mode: 'stage',
  reviewAction: 'auto',        // Auto-route by score
  promoteThreshold: 80,        // High quality threshold
  reEnrichThreshold: 50,       // Re-enrichment threshold
  entitiesField: 'entities',   // Map entity field
  relationshipsField: 'relationships'
}
```

#### Stage Retry (Checkpoint #3)
```javascript
{
  mode: 'stage',
  reviewAction: 'skip',        // Just checkpoint
  promoteThreshold: 60,        // Lowered after enrichment
  reEnrichThreshold: 0         // Prevent infinite loop
}
```

### Quality Router (Switch Node)
```javascript
{
  field: 'stagingScore',
  mode: 'expression',
  cases: [
    { value: 'stagingScore >= 80', portId: 'high-quality' },
    { value: 'stagingScore >= 50 && stagingScore < 80', portId: 're-enrich' },
    { value: 'stagingScore < 50', portId: 'review' }
  ]
}
```

---

## Quality Scoring System

Content is scored across **5 dimensions** (0-100 each):

### Dimensions

| Dimension | Weight | Criteria |
|-----------|--------|----------|
| **Content** | 25% | Length, structure, markdown formatting |
| **Entities** | 25% | Count (aim for 10+), type diversity, definitions |
| **Relationships** | 20% | Count (aim for 5+), meaningful connections |
| **Completeness** | 20% | Title, description, summary, keywords |
| **Overall** | 10% | General quality assessment |

### Score Calculation
```javascript
overallScore = (content * 0.25) + (entities * 0.25) +
               (relationships * 0.20) + (completeness * 0.20) +
               (overall * 0.10)
```

### Routing Thresholds

| Score Range | Route | Action |
|-------------|-------|--------|
| **≥80** | `high-quality` | Direct to Cortex Memories |
| **50-79** | `re-enrich` | LLM enhancement, then retry |
| **<50** | `review` | Flagged for manual review, still stored |

---

## Re-Enrichment Loop

When content scores 50-79, it enters the re-enrichment path:

### Re-Enrichment Expert Tasks
1. **Entity Enhancement** - Add missing entities (target: 15+)
2. **Relationship Mapping** - Map connections (target: 10+)
3. **Content Expansion** - Add context, examples, structure
4. **Metadata Enrichment** - Improve title, summary, keywords

### Loop Prevention
- `stage-retry` node has `reEnrichThreshold: 0`
- Content only goes through re-enrichment once
- After retry, content proceeds to Merge regardless of score

### Model Selection
```javascript
're-enrichment': 'anthropic/claude-sonnet-4'  // High-quality model for enhancement
```

---

## Resilience Features

### 1. Per-Record Checkpointing
Each record is checkpointed at 3 points:
- **Checkpoint #1**: Immediately after fetch (raw content)
- **Checkpoint #2**: After expert analysis (enriched)
- **Checkpoint #3**: After re-enrichment (if applicable)

### 2. Compressed Storage
- Smart compression: Only for content >10KB
- Algorithm: Brotli (best compression ratio)
- Checksum validation: SHA-256 for integrity

### 3. TTL-Based Recovery
- Staged content retained for 30 days
- Allows manual recovery if needed
- Automatic cleanup after TTL

### 4. Failure Recovery
```
Failure Point          → Recovery Action
─────────────────────────────────────────
Source fails           → Re-run pipeline
Expert fails           → Resume from stage-raw
Scoring fails          → Resume from stage-enriched
Re-enrichment fails    → Resume from stage-enriched
Memories fails         → Resume from merge
```

---

## Usage Guide

### Seeding the Pipeline
```bash
# Default user
node scripts/seed-knowledge-ingestion-pipeline-v3.cjs

# Specific user
node scripts/seed-knowledge-ingestion-pipeline-v3.cjs user@example.com
```

### Running the Pipeline
1. Open Flux pipeline builder
2. Load "🧠 Deep Knowledge Research Pipeline V3"
3. Configure Knowledge Source URL
4. Execute the pipeline

### Monitoring Execution
- Check staging collections for checkpoints
- Monitor quality scores in stage-enriched output
- Review flagged content (score <50) in staging

### Customizing Thresholds
Edit the staging node configs:
```javascript
// Higher quality bar
promoteThreshold: 90,
reEnrichThreshold: 70

// Lower quality bar (more permissive)
promoteThreshold: 70,
reEnrichThreshold: 40
```

---

## Troubleshooting

### Content Not Reaching Memories
1. Check `stage-enriched` output for quality scores
2. Verify `quality-router` connections
3. Check `merge` node is receiving from all paths

### Re-Enrichment Loop
- Should only happen once per record
- If looping, check `stage-retry.reEnrichThreshold` is 0

### Low Quality Scores
1. Check entity extraction in `entity-mapper`
2. Verify relationships are being mapped
3. Consider adjusting expert prompts

### Missing Checkpoints
1. Verify `knowledge-staging` nodes are enabled
2. Check MongoDB `knowledge_staging` collection
3. Verify compression is not failing

---

## Related Files

- **Pipeline Script**: `scripts/seed-knowledge-ingestion-pipeline-v3.cjs`
- **Staging Service**: `src/lib/server/cortex/KnowledgeStagingService.ts`
- **Staging Executor**: `src/lib/server/execution/executors/KnowledgeStagingExecutor.ts`
- **Re-Enrichment Service**: `src/lib/server/cortex/ReEnrichmentService.ts`
- **Node Implementation**: `src/lib/nodes/KnowledgeStagingNodeImpl.ts`

---

## Changelog

### V3.0 (January 2026)
- Complete architecture redesign
- Added 3-checkpoint resilience model
- Added quality-based routing with Switch node
- Added automatic re-enrichment loop
- Per-record streaming processing

### V2.0 (Previous)
- Linear flow with single staging point
- Manual re-enrichment only

### V1.0 (Original)
- No staging, direct to Cortex Memories
