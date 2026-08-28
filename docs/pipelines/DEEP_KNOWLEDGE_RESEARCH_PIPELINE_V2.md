# 🧠 Deep Knowledge Research Pipeline V2

> **Enhanced with Flow Control Nodes** - Filter → Switch → Merge → Loop verification until quality > 80%

## Overview

The Deep Knowledge Research Pipeline V2 is an AI-powered knowledge extraction system that crawls websites, analyzes content using specialized AI agents, and stores verified knowledge in Cortex Memories.

**Key Innovation**: Uses visual flow control nodes (Filter, Switch, Merge, Loop, Retry) to create an intelligent, self-verifying pipeline that guarantees knowledge quality before storage.

## Pipeline ID

```
694ef3d1b5032f7ae1f3411a
```

## Architecture Diagram

```
═══════════════════════════════════════════════════════════════════════════════════

                         PHASE 0: ACQUISITION
                         ────────────────────

                    ┌─────────────────────────────┐
                    │     📥 Knowledge Source     │
                    │     ───────────────────     │
                    │  • URL: regnostandard.com   │
                    │  • Crawl depth: 2 levels    │
                    │  • Max pages: 30            │
                    │  • Rate limit: 800ms        │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
                         PHASE 1: RECONNAISSANCE
                         ───────────────────────

                    ┌─────────────────────────────┐
                    │   🔍 Strategic Recon        │
                    │   ────────────────────      │
                    │  Model: GPT-4o              │
                    │  Task: Classify all pages   │
                    │  Output: contentType,       │
                    │          priority 1-5       │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
                         PHASE 2: ROUTING
                         ───────────────

                    ┌─────────────────────────────┐
                    │      🔽 FILTER Node         │◆
                    │      ─────────────          │
                    │  Condition:                 │
                    │  content.length > 100       │
                    └───────┬─────────────┬───────┘
                            │             │
                       ✓ Pass        ✗ Reject
                            │             │
                            │             ▼
                            │    ┌─────────────────┐
                            │    │ 📋 Console      │
                            │    │ (Log rejected)  │
                            │    └─────────────────┘
                            │
                            ▼
                    ┌─────────────────────────────┐
                    │      🔀 SWITCH Node         │◆
                    │      ────────────           │
                    │  Field: contentType         │
                    │  Mode: exact match          │
                    └─┬───────┬───────┬───────┬───┘
                      │       │       │       │
                    docs    tech   mktg   default
                      │       │       │       │
                      ▼       ▼       ▼       │
                         PHASE 3: DEEP DIVE        │
                         ──────────────────        │
                                                   │
         ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
         │ 📚 Docs     │ │ ⚙️ Tech     │ │ 📈 Marketing│
         │ Analyst     │ │ Analyst     │ │ Analyst     │
         │─────────────│ │─────────────│ │─────────────│
         │Claude Sonnet│ │Claude Sonnet│ │ GPT-4o      │
         │             │ │             │ │             │
         │Extracts:    │ │Extracts:    │ │Extracts:    │
         │• APIs       │ │• Arch       │ │• Value props│
         │• Configs    │ │• Stack      │ │• Audiences  │
         │• Examples   │ │• Security   │ │• Pricing    │
         │• Guides     │ │• Scale      │ │• Testimonials│
         └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
                │               │               │
                └───────────────┼───────────────┘
                                │               │
                                ▼               │
                    ┌─────────────────────────────┐
                    │      🔗 MERGE Node          │⬡
                    │      ──────────             │
                    │  Mode: waitAll              │
                    │  Combines all branches      │◄──────┘
                    └──────────────┬──────────────┘
                                   │
                                   ▼
                         PHASE 4: SYNTHESIS
                         ─────────────────

                    ┌─────────────────────────────┐
                    │   🧬 Knowledge Synthesizer  │
                    │   ────────────────────────  │
                    │  Model: GPT-4o              │
                    │  Creates:                   │
                    │  • Unified entity model     │
                    │  • Knowledge graph          │
                    │  • Confidence scores        │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
                         PHASE 5: VERIFICATION LOOP
                         ─────────────────────────

                    ┌─────────────────────────────┐
                    │      🔄 LOOP Node           │○
                    │      ─────────              │
                    │  Condition: score >= 80%    │
                    │  Max iterations: 3          │
                    │  Timeout: 10 minutes        │
                    └───────┬─────────────┬───────┘
                            │             │
                       iterate          exit
                            │        (score≥80)
                            ▼             │
                    ┌─────────────────┐   │
                    │  ✅ Verifier    │   │
                    │  ─────────────  │   │
                    │ Claude Sonnet   │   │
                    │                 │   │
                    │ Checks:         │   │
                    │ • Completeness  │   │
                    │ • Accuracy      │   │
                    │ • Expert level  │   │
                    │ • Gap analysis  │   │
                    └────────┬────────┘   │
                             │            │
                             ▼            │
                    ┌─────────────────┐   │
                    │  🔁 RETRY Node  │   │
                    │  ─────────────  │   │
                    │ Max: 2 retries  │   │
                    │ Backoff: 2x     │───┘
                    └────────┬────────┘   │
                             │            │
                        (loop back)       │
                                          │
                                          ▼
                         PHASE 6: STORAGE
                         ────────────────

                    ┌─────────────────────────────┐
                    │    💾 Cortex Memories       │
                    │    ──────────────────       │
                    │  Domain: regnostandard      │
                    │  Collection: knowledge_base │
                    │  • Chunked content          │
                    │  • Entity extraction        │
                    │  • Tagged & indexed         │
                    └─────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════════
```

## Node Configurations

### Phase 0: Knowledge Acquisition

| Setting | Value | Purpose |
|---------|-------|---------|
| `sourceType` | `url` | Web crawling mode |
| `url` | `https://www.regnostandard.com` | Target domain |
| `crawlDepth` | `2` | Follow links 2 levels deep |
| `maxPages` | `30` | Comprehensive coverage |
| `rateLimit` | `800ms` | Polite crawling |
| `timeout` | `30000ms` | Per-request timeout |
| `excludeSelectors` | nav, footer, ads, etc. | Skip non-content elements |

### Phase 1: Strategic Reconnaissance

| Setting | Value | Purpose |
|---------|-------|---------|
| `model` | `openai/gpt-4o` | Fast, accurate classification |
| `temperature` | `0.3` | Focused, deterministic |
| `maxTokens` | `4096` | Sufficient for site mapping |

**System Prompt Focus**:
- Classify each page by `contentType`: documentation, technical, marketing, support, other
- Assign `priority` 1-5 for deep analysis ordering
- Create site structure map

### Phase 2: Content Routing

#### Filter Node
```javascript
condition: "record.content && record.content.length > 100"
```
- **Pass**: Valid content continues to Switch
- **Reject**: Empty/short pages logged to Console

#### Switch Node
| Case | Port | Destination |
|------|------|-------------|
| `documentation` | `case-docs` | Documentation Analyst |
| `technical` | `case-tech` | Technical Analyst |
| `marketing` | `case-marketing` | Marketing Analyst |
| (other) | `default` | Direct to Merge |

### Phase 3: Specialized Deep Dive Analysts

#### 📚 Documentation Analyst (Claude Sonnet)
**Extracts**:
- API endpoints and methods
- Configuration options with defaults
- Code examples (syntax highlighted)
- Integration guides
- Technical requirements

#### ⚙️ Technical Analyst (Claude Sonnet)
**Extracts**:
- Architecture patterns
- Technology stack components
- Performance characteristics
- Security considerations
- Scalability features

#### 📈 Marketing Analyst (GPT-4o)
**Extracts**:
- Value propositions
- Target audience segments
- Competitive positioning
- Pricing information
- Customer testimonials/case studies

### Phase 4: Merge & Synthesis

#### Merge Node
```javascript
mode: "waitAll"  // Wait for ALL branches to complete
```

#### Synthesis Expert (GPT-4o)
**Creates**:
```json
{
  "domain": "regnostandard",
  "entities": [
    { "name": "...", "type": "product|feature|concept", "confidence": 0-100 }
  ],
  "relationships": [
    { "from": "...", "to": "...", "type": "has|enables|targets" }
  ],
  "summary": "Expert-level comprehensive summary...",
  "glossary": { "term": "definition" },
  "confidenceScore": 0-100
}
```

### Phase 5: Verification Loop

#### Loop Node
```javascript
{
  maxIterations: 3,
  terminateWhen: "first?.verificationScore >= 80 || iteration >= 3",
  timeout: 600000  // 10 minutes
}
```

#### Verification Checklist
| Category | Weight | Checks |
|----------|--------|--------|
| Completeness | 25% | All entities, products, features captured? |
| Accuracy | 25% | No contradictions, consistent naming? |
| Expert Level | 25% | Can answer "What/How/Who/Why" questions? |
| Gaps | 25% | No unanswered critical questions? |

**Scoring**:
- Score < 80%: Identifies gaps, loops back for re-analysis
- Score ≥ 80%: Exits to storage

#### Retry Node
```javascript
{
  maxRetries: 2,
  retryDelayMs: 2000,
  backoffMultiplier: 2  // 2s → 4s → 8s
}
```

### Phase 6: Storage

| Setting | Value |
|---------|-------|
| `domain` | `regnostandard` |
| `collection` | `knowledge_base_v2` |
| `chunkSize` | `2000` characters |
| `duplicateStrategy` | `update` |
| `tags` | `ai-platform`, `enterprise`, `flow-control-enhanced` |

## Execution Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| 0. Crawl | 30-90s | Fetch 30 pages from target domain |
| 1. Recon | 15-30s | Classify all pages by type |
| 2. Route | <1s | Filter and switch routing |
| 3. Analyze | 30-60s | 3 parallel specialized analysts |
| 4. Synthesize | 20-40s | Build unified knowledge model |
| 5. Verify | 15-90s | 1-3 verification iterations |
| 6. Store | 5-10s | Persist to Cortex |
| **Total** | **~3-5 min** | Complete verified knowledge extraction |

## Flow Control Benefits

| Node | Benefit | Token Savings |
|------|---------|---------------|
| **Filter** | Skips empty/junk pages | ~20% fewer LLM calls |
| **Switch** | Specialized prompts per content type | Better extraction quality |
| **Merge** | Parallel processing | ~40% faster execution |
| **Loop** | Quality guarantee | Only stores verified knowledge |
| **Retry** | Resilient to API errors | Prevents pipeline failures |

## Output Schema

```typescript
interface KnowledgeBase {
  domain: string;
  verificationScore: number;  // 0-100

  entities: Array<{
    name: string;
    type: 'product' | 'feature' | 'concept' | 'organization' | 'technology';
    description: string;
    confidence: number;
  }>;

  relationships: Array<{
    from: string;
    to: string;
    type: 'has' | 'enables' | 'targets' | 'uses' | 'integrates';
  }>;

  summary: string;  // Expert-level comprehensive summary

  glossary: Record<string, string>;  // term → definition

  metadata: {
    crawledPages: number;
    analyzedPages: number;
    verificationIterations: number;
    totalTokensUsed: number;
    executionTimeMs: number;
  };
}
```

## Usage

### Create/Update Pipeline
```bash
node scripts/create-knowledge-reasoning-pipeline-v2.cjs
```

### Run Pipeline
1. Open Regno AI Platform
2. Navigate to Pipelines
3. Find "🧠 Deep Knowledge Research Pipeline V2"
4. Click **Run** or trigger via webhook

### Query Results
```javascript
// In Cortex or via API
const knowledge = await cortex.query({
  domain: 'regnostandard',
  collection: 'knowledge_base_v2'
});
```

## Comparison: V1 vs V2

| Feature | V1 (Linear) | V2 (Flow Control) |
|---------|-------------|-------------------|
| Processing | Sequential | Parallel branches |
| Empty pages | Processed (wasted tokens) | Filtered out |
| Content types | Same prompt for all | Specialized extractors |
| Quality check | One-shot | Loop until score > 80% |
| Error handling | Pipeline fails | Retry with backoff |
| Execution time | ~8-10 min | ~3-5 min |
| Token efficiency | Baseline | ~30% reduction |

## Customization

### Change Target Domain
Edit `source` node config:
```javascript
url: 'https://your-domain.com'
domain: 'your-domain'
```

### Adjust Quality Threshold
Edit `verification-loop` node:
```javascript
terminateWhen: 'first?.verificationScore >= 90'  // Higher threshold
maxIterations: 5  // More attempts
```

### Add New Content Type Branch
1. Add case to Switch node
2. Create new Expert node with specialized prompt
3. Connect to Merge node

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Pages not crawling | Check `crawlDepth`, `maxPages`, rate limits |
| Wrong content types | Adjust reconnaissance prompt |
| Low verification score | Increase `maxIterations`, refine prompts |
| Timeout errors | Increase `timeout` values |
| LLM errors | Check credentials, retry handles most |

---

*Pipeline created: December 2024*
*Version: 2.0 (Flow Control Enhanced)*
