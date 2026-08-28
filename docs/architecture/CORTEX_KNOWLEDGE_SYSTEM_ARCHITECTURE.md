# CORTEX Knowledge System Architecture

## Vision Statement

**CORTEX is Regno's AI-powered Domain Expert System** - a knowledge accumulation and reasoning platform that ingests information from diverse sources, builds deep expertise over time, and uses that accumulated knowledge to perform complex intelligent tasks.

Think of it as **Google's NotebookLM on steroids** - not just summarizing documents, but becoming a genuine expert that can synthesize knowledge across domains to solve real-world problems.

---

## Core Concept: Knowledge Memories

A **Memory** in CORTEX is a unit of captured knowledge that includes:
- Raw content (text, structured data, visual descriptions)
- Extracted entities (concepts, terms, products, regulations, etc.)
- Relationships between entities
- Semantic embeddings for retrieval
- Source provenance and confidence scores
- Domain classification

**Memories accumulate over time**, building an ever-growing knowledge base that CORTEX can query to become an expert in any field.

---

## Real-World Scenario: Power Site Design

### The Goal
User wants to design a **14MW battery power site** at a specific location (lat/lon anywhere in the world).

### Knowledge Domains Ingested

| Domain | Source Types | Example Content |
|--------|--------------|-----------------|
| `regno-standard` | URLs, PDFs | Parameters, specifications, naming conventions |
| `regulatory-compliance` | PDFs, Gov websites | Regional regulations, permits, safety codes |
| `power-architecture` | PDFs, Technical docs | Site layouts, electrical diagrams, best practices |
| `equipment-products` | Manufacturer PDFs, Datasheets | Batteries, inverters, switches, control systems, specs |
| `environmental` | APIs, Research papers | Weather data, seismic zones, flood risks |
| `grid-interconnection` | Utility docs | Grid codes, interconnection requirements |

### The Query
```
"Create a site map for a 14MW battery energy storage system at coordinates
51.5074, -0.1278 (London, UK). Include equipment selection, layout, and
compliance considerations."
```

### CORTEX Response
Using accumulated knowledge across ALL relevant memories:

1. **Regulatory Analysis** (from `regulatory-compliance` memories)
   - UK Grid Code requirements
   - Planning permissions for energy storage
   - Fire safety regulations (NFPA 855 equivalent)

2. **Site Layout** (from `power-architecture` memories)
   - Optimal container arrangement for 14MW
   - Access roads and emergency egress
   - Fire suppression system placement

3. **Equipment Selection** (from `equipment-products` memories)
   - Battery modules: Tesla Megapack or BYD Cube
   - Inverters: 3.5MW units x 4 for redundancy
   - Switchgear: Medium voltage (33kV) rated
   - Control system: SCADA integration specs

4. **Generated Output**
   - Site diagram (SVG/CAD-ready)
   - Bill of materials with specs
   - Compliance checklist
   - Risk assessment

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CORTEX KNOWLEDGE SYSTEM                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     KNOWLEDGE INGESTION LAYER                        │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │   │
│  │   │  URLs   │  │  PDFs   │  │ Images  │  │Research │  │  APIs   │  │   │
│  │   │ Scraper │  │ Parser  │  │ Vision  │  │ Papers  │  │ Feeds   │  │   │
│  │   └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  │   │
│  │        │            │            │            │            │       │   │
│  │        └────────────┴────────────┴────────────┴────────────┘       │   │
│  │                                  │                                  │   │
│  │                                  ▼                                  │   │
│  │                    ┌─────────────────────────┐                      │   │
│  │                    │   EXTRACTION ENGINE     │                      │   │
│  │                    │  • Entity Extraction    │                      │   │
│  │                    │  • Relationship Mapping │                      │   │
│  │                    │  • Concept Linking      │                      │   │
│  │                    │  • Summary Generation   │                      │   │
│  │                    └───────────┬─────────────┘                      │   │
│  │                                │                                    │   │
│  └────────────────────────────────┼────────────────────────────────────┘   │
│                                   │                                         │
│  ┌────────────────────────────────┼────────────────────────────────────┐   │
│  │                     STAGING & VALIDATION LAYER                       │   │
│  ├────────────────────────────────┼────────────────────────────────────┤   │
│  │                                ▼                                     │   │
│  │              ┌─────────────────────────────────┐                    │   │
│  │              │      KNOWLEDGE STAGING          │                    │   │
│  │              │   (Compressed Binary Storage)   │                    │   │
│  │              │                                 │                    │   │
│  │              │  • ZSTD Compressed Content      │                    │   │
│  │              │  • Extracted Metadata           │                    │   │
│  │              │  • Quality Pre-Score            │                    │   │
│  │              └───────────────┬─────────────────┘                    │   │
│  │                              │                                      │   │
│  │                              ▼                                      │   │
│  │              ┌─────────────────────────────────┐                    │   │
│  │              │       QUALITY GATEWAY           │                    │   │
│  │              │                                 │                    │   │
│  │              │  Score ≥ 80: PROMOTE            │                    │   │
│  │              │  Score 50-79: RE-ENRICH         │                    │   │
│  │              │  Score < 50: FLAG FOR REVIEW    │                    │   │
│  │              └───────────────┬─────────────────┘                    │   │
│  │                              │                                      │   │
│  └──────────────────────────────┼──────────────────────────────────────┘   │
│                                 │                                          │
│  ┌──────────────────────────────┼──────────────────────────────────────┐   │
│  │                    KNOWLEDGE STORAGE LAYER                           │   │
│  ├──────────────────────────────┼──────────────────────────────────────┤   │
│  │                              ▼                                       │   │
│  │    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐            │   │
│  │    │  MongoDB    │    │   Neo4j     │    │   Qdrant    │            │   │
│  │    │             │    │             │    │             │            │   │
│  │    │ • Documents │    │ • Entities  │    │ • Vectors   │            │   │
│  │    │ • Full text │    │ • Relations │    │ • Semantic  │            │   │
│  │    │ • Metadata  │    │ • Paths     │    │ • Similarity│            │   │
│  │    └─────────────┘    └─────────────┘    └─────────────┘            │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      REASONING LAYER                                  │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │                                                                       │   │
│  │    ┌───────────────────────────────────────────────────────────┐     │   │
│  │    │                    CORTEX BRAIN                            │     │   │
│  │    │                                                            │     │   │
│  │    │  Query: "Design a 14MW power site at lat/lon"              │     │   │
│  │    │                         │                                  │     │   │
│  │    │                         ▼                                  │     │   │
│  │    │  ┌─────────────────────────────────────────────────────┐  │     │   │
│  │    │  │ 1. Semantic Search (Qdrant)                         │  │     │   │
│  │    │  │    → Find relevant memories by meaning              │  │     │   │
│  │    │  ├─────────────────────────────────────────────────────┤  │     │   │
│  │    │  │ 2. Graph Traversal (Neo4j)                          │  │     │   │
│  │    │  │    → Find connected concepts & relationships        │  │     │   │
│  │    │  ├─────────────────────────────────────────────────────┤  │     │   │
│  │    │  │ 3. Document Retrieval (MongoDB)                     │  │     │   │
│  │    │  │    → Get full content for context                   │  │     │   │
│  │    │  ├─────────────────────────────────────────────────────┤  │     │   │
│  │    │  │ 4. LLM Reasoning                                    │  │     │   │
│  │    │  │    → Synthesize knowledge into response             │  │     │   │
│  │    │  └─────────────────────────────────────────────────────┘  │     │   │
│  │    │                         │                                  │     │   │
│  │    │                         ▼                                  │     │   │
│  │    │               [Intelligent Response]                       │     │   │
│  │    │               • Site Diagram                               │     │   │
│  │    │               • Equipment List                             │     │   │
│  │    │               • Compliance Report                          │     │   │
│  │    │               • Risk Assessment                            │     │   │
│  │    └───────────────────────────────────────────────────────────┘     │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Knowledge Ingestion Pipeline

### Source Adapters

Each source type has a specialized adapter:

#### 1. URL Scraper
```typescript
{
  type: 'url',
  capabilities: ['html', 'markdown', 'structured_data'],
  extraction: {
    title: true,
    content: true,
    links: true,
    images: true,
    metadata: true
  }
}
```

#### 2. PDF Parser
```typescript
{
  type: 'pdf',
  capabilities: ['text', 'tables', 'images', 'diagrams'],
  extraction: {
    pages: true,
    toc: true,
    tables: true,
    figures: true,
    ocr: true  // For scanned docs
  }
}
```

#### 3. Image Vision
```typescript
{
  type: 'image',
  capabilities: ['description', 'text_extraction', 'diagram_analysis'],
  extraction: {
    description: true,      // What's in the image
    text: true,             // OCR
    objects: true,          // Detected objects
    diagrams: true,         // Technical diagram analysis
    relationships: true     // Spatial relationships
  }
}
```

#### 4. Research Papers
```typescript
{
  type: 'research',
  capabilities: ['abstract', 'citations', 'methodology', 'findings'],
  extraction: {
    abstract: true,
    authors: true,
    citations: true,
    methodology: true,
    results: true,
    conclusions: true
  }
}
```

#### 5. API Feeds
```typescript
{
  type: 'api',
  capabilities: ['structured_data', 'real_time', 'incremental'],
  extraction: {
    schema_inference: true,
    entity_mapping: true,
    change_tracking: true
  }
}
```

### Extraction Engine

The Extraction Engine processes raw content and produces structured knowledge:

```typescript
interface ExtractedKnowledge {
  // Core content
  title: string;
  summary: string;
  content: string;
  markdown?: string;

  // Structured extraction
  entities: Entity[];           // People, orgs, products, concepts
  relationships: Relationship[];// How entities connect
  facts: Fact[];                // Verifiable statements
  procedures: Procedure[];      // Step-by-step processes
  specifications: Spec[];       // Technical specifications

  // Metadata
  sourceType: SourceType;
  sourceUrl?: string;
  confidence: number;
  extractedAt: Date;

  // For re-processing
  rawContent: Buffer;           // Compressed original
}
```

### Entity Types

```typescript
type EntityType =
  | 'concept'           // Abstract ideas (e.g., "grid stability")
  | 'term'              // Technical terms (e.g., "state of charge")
  | 'product'           // Physical products (e.g., "Tesla Megapack")
  | 'organization'      // Companies, agencies (e.g., "National Grid")
  | 'regulation'        // Laws, standards (e.g., "NFPA 855")
  | 'specification'     // Technical specs (e.g., "3.5MW inverter")
  | 'location'          // Places (e.g., "London, UK")
  | 'procedure'         // Processes (e.g., "commissioning sequence")
  | 'measurement'       // Quantities (e.g., "14MW capacity")
  | 'constraint'        // Limitations (e.g., "max 50dB noise")
  ;
```

### Relationship Types

```typescript
type RelationshipType =
  | 'REQUIRES'          // A requires B
  | 'PRODUCES'          // A produces B
  | 'CONTAINS'          // A contains B
  | 'REGULATES'         // A regulates B
  | 'COMPATIBLE_WITH'   // A works with B
  | 'CONFLICTS_WITH'    // A conflicts with B
  | 'SUPERSEDES'        // A replaces B
  | 'PART_OF'           // A is part of B
  | 'LOCATED_IN'        // A is in location B
  | 'MANUFACTURED_BY'   // A made by B
  | 'CERTIFIED_BY'      // A certified by B
  ;
```

---

## Staging & Validation Layer

### Purpose
Ensure we capture **everything required to become an expert** before committing to permanent storage.

### Staging Collection Schema

```typescript
interface StagedKnowledge {
  _id: ObjectId;

  // Session tracking
  sessionId: string;
  batchId: string;
  domain: string;

  // Source information
  sourceType: SourceType;
  sourceUrl?: string;
  sourceFile?: string;

  // Compressed content (ZSTD)
  compressed: {
    content: Binary;          // Full extracted content
    raw: Binary;              // Original source (for re-processing)
    algorithm: 'zstd';
    level: 3;
    originalSize: number;
    compressedSize: number;
  };

  // Extracted metadata (queryable, not compressed)
  metadata: {
    title: string;
    wordCount: number;
    entityCount: number;
    relationshipCount: number;
    factCount: number;
    hasStructuredData: boolean;
    hasDiagrams: boolean;
    hasTables: boolean;
    hasCode: boolean;
  };

  // Quality scoring
  score: IngestionScore;

  // Review workflow
  review: {
    status: 'pending' | 'approved' | 'needs_enrichment' | 'rejected' | 'promoted';
    attempts: number;
    maxAttempts: 3;
    lastReviewedAt?: Date;
    reviewNotes?: string;
    enrichmentStrategy?: string;  // What to try next
  };

  // Lifecycle
  createdAt: Date;
  expiresAt: Date;              // TTL - default 30 days
  promotedAt?: Date;
}
```

### Quality Gateway Logic

```typescript
async function evaluateAndRoute(staged: StagedKnowledge): Promise<ReviewDecision> {
  const score = staged.score.overall;

  if (score >= 80) {
    // HIGH QUALITY - Promote immediately
    return {
      action: 'promote',
      confidence: 'high',
      reason: 'Score exceeds threshold for automatic promotion'
    };
  }

  if (score >= 50 && staged.review.attempts < 3) {
    // MEDIUM QUALITY - Try re-enrichment
    const strategy = determineEnrichmentStrategy(staged);
    return {
      action: 're_enrich',
      confidence: 'medium',
      strategy: strategy,
      reason: `Score ${score} below threshold. Attempting ${strategy}`
    };
  }

  if (score < 50 || staged.review.attempts >= 3) {
    // LOW QUALITY or MAX ATTEMPTS - Flag for manual review
    return {
      action: 'flag_for_review',
      confidence: 'low',
      reason: score < 50
        ? 'Score too low for automatic processing'
        : 'Max enrichment attempts reached'
    };
  }
}

function determineEnrichmentStrategy(staged: StagedKnowledge): EnrichmentStrategy {
  const score = staged.score;

  // Prioritize the weakest dimension
  if (score.dimensions.entities < 50) {
    return 'deep_entity_extraction';
  }
  if (score.dimensions.content < 50) {
    return 'content_expansion';
  }
  if (score.dimensions.relationships < 50) {
    return 'relationship_mapping';
  }
  if (score.dimensions.completeness < 50) {
    return 'metadata_enrichment';
  }

  return 'general_enhancement';
}
```

### Re-Enrichment Strategies

| Strategy | Description | LLM Prompt Focus |
|----------|-------------|------------------|
| `deep_entity_extraction` | Extract more entities | "Identify ALL technical terms, products, organizations, and concepts" |
| `content_expansion` | Expand sparse content | "Elaborate on key points, add context and explanations" |
| `relationship_mapping` | Find connections | "Identify how entities relate to each other" |
| `metadata_enrichment` | Complete metadata | "Generate title, summary, and classification" |
| `general_enhancement` | Overall improvement | "Enhance this knowledge for expert-level understanding" |

---

## Knowledge Storage Layer

### MongoDB: Document Store

**Collection: `cortex_memories`**

Stores the complete knowledge document with full-text search capabilities.

```typescript
interface CortexMemory {
  _id: ObjectId;

  // Identity
  domain: string;
  title: string;

  // Content
  content: string;
  markdown: string;
  summary: string;

  // Entities (denormalized for fast access)
  entities: Array<{
    name: string;
    type: EntityType;
    definition: string;
    confidence: number;
  }>;

  // Source tracking
  sourceType: SourceType;
  sourceUrl?: string;
  sourceName: string;

  // Quality
  ingestionScore: number;
  ingestionGrade: 'A' | 'B' | 'C' | 'D' | 'F';

  // Lifecycle
  version: number;
  createdAt: Date;
  updatedAt: Date;

  // Indexes
  tags: string[];
  keywords: string[];
}
```

**Indexes:**
- Text index on `content`, `markdown`, `title`, `summary`
- Compound index on `domain`, `createdAt`
- Index on `entities.name`, `entities.type`
- Index on `tags`, `keywords`

### Neo4j: Knowledge Graph

Stores entities and their relationships for graph traversal.

**Node Types:**
```cypher
// Entity nodes
(:Entity {
  id: string,
  name: string,
  type: string,
  domain: string,
  definition: string,
  confidence: float
})

// Memory reference nodes
(:Memory {
  id: string,
  domain: string,
  title: string
})
```

**Relationship Types:**
```cypher
// Entity relationships
(e1:Entity)-[:REQUIRES {weight: float, source: string}]->(e2:Entity)
(e1:Entity)-[:COMPATIBLE_WITH {weight: float}]->(e2:Entity)
(e1:Entity)-[:REGULATES {authority: string}]->(e2:Entity)

// Memory to entity links
(m:Memory)-[:CONTAINS_ENTITY {confidence: float}]->(e:Entity)
(m:Memory)-[:RELATED_TO {similarity: float}]->(m2:Memory)
```

### Qdrant: Vector Store

Stores semantic embeddings for similarity search.

**Collection: `cortex_memories`**

```typescript
interface QdrantPoint {
  id: string;
  vector: number[];  // 3072 dimensions (OpenAI text-embedding-3-large)
  payload: {
    domain: string;
    title: string;
    type: 'memory_chunk' | 'entity' | 'fact' | 'procedure';
    mongoId: string;
    chunkIndex?: number;
    content: string;  // First 10000 chars for retrieval
  };
}
```

**Chunking Strategy:**
- Chunk size: 1000 characters
- Overlap: 200 characters
- Semantic boundaries: Prefer paragraph/section breaks

---

## Reasoning Layer: CORTEX Brain

### Query Processing Flow

```typescript
async function intelligentQuery(
  query: string,
  options: QueryOptions
): Promise<IntelligentResponse> {

  // 1. SEMANTIC SEARCH (Qdrant)
  // Find memories that are semantically similar to the query
  const semanticMatches = await qdrantService.searchSimilar(
    await embedQuery(query),
    { limit: 20, threshold: 0.7 }
  );

  // 2. GRAPH TRAVERSAL (Neo4j)
  // Find connected entities and expand the knowledge graph
  const entityExpansion = await neo4jService.expandFromEntities(
    extractEntitiesFromQuery(query),
    { depth: 2, limit: 50 }
  );

  // 3. DOCUMENT RETRIEVAL (MongoDB)
  // Get full documents for the matched memories
  const documents = await cortexMemories.getByIds(
    [...semanticMatches.map(m => m.mongoId), ...entityExpansion.memoryIds]
  );

  // 4. CONTEXT ASSEMBLY
  // Build a comprehensive context from all sources
  const context = assembleContext({
    query,
    semanticMatches,
    entityExpansion,
    documents,
    maxTokens: 100000  // Large context for comprehensive reasoning
  });

  // 5. LLM REASONING
  // Synthesize knowledge into a response
  const response = await llmService.reason({
    systemPrompt: buildExpertSystemPrompt(options.domain),
    context: context,
    query: query,
    outputFormat: options.outputFormat
  });

  // 6. CITATION & VERIFICATION
  // Add source citations and confidence scores
  return {
    response: response,
    citations: extractCitations(response, documents),
    confidence: calculateConfidence(semanticMatches, entityExpansion),
    memoriesUsed: documents.map(d => d._id)
  };
}
```

### Expert System Prompt Template

```typescript
function buildExpertSystemPrompt(domain: string): string {
  return `You are an expert in ${domain} with access to a comprehensive knowledge base.

Your knowledge comes from:
- Technical documentation and specifications
- Regulatory and compliance documents
- Product guides and datasheets
- Research papers and best practices
- Real-world implementation examples

When answering questions:
1. Use ONLY the knowledge provided in the context
2. Cite specific sources when making claims
3. Acknowledge uncertainty when knowledge is incomplete
4. Provide actionable, specific recommendations
5. Consider regulatory and safety requirements
6. Include relevant specifications and measurements

If you don't have sufficient knowledge to answer, say so clearly and indicate what additional knowledge would be needed.`;
}
```

---

## Implementation Phases

### Phase 1: Foundation (Current)
- [x] Basic Memories node with multi-backend storage
- [x] Entity extraction from Expert nodes
- [x] Quality scoring system
- [ ] Staging collection with compression
- [ ] Review gateway

### Phase 2: Robust Ingestion
- [ ] PDF parser integration
- [ ] Image vision analysis
- [ ] Research paper parser
- [ ] Re-enrichment pipeline
- [ ] Manual review queue

### Phase 3: Advanced Retrieval
- [ ] Multi-hop graph traversal
- [ ] Hybrid search (semantic + keyword + graph)
- [ ] Context assembly optimization
- [ ] Citation tracking

### Phase 4: Expert Reasoning
- [ ] Domain-specific prompts
- [ ] Multi-turn reasoning
- [ ] Output generation (diagrams, reports)
- [ ] Confidence calibration

### Phase 5: Scale & Performance
- [ ] Batch ingestion optimization
- [ ] Incremental updates
- [ ] Cross-domain reasoning
- [ ] Knowledge versioning

---

## Key Success Metrics

### Ingestion Quality
- **Coverage**: % of source content captured
- **Entity Extraction Rate**: Entities per 1000 words
- **Relationship Density**: Relationships per entity
- **Score Distribution**: Target 80% grade B or above

### Retrieval Quality
- **Recall@10**: Relevant documents in top 10 results
- **Precision**: % of retrieved docs that are relevant
- **Answer Coverage**: % of answer supported by citations

### Expert Performance
- **Task Completion**: Can CORTEX complete expert-level tasks?
- **Accuracy**: Are the answers correct?
- **Confidence Calibration**: Does stated confidence match accuracy?

---

## Security & Compliance

### Data Protection
- All content encrypted at rest
- Access controlled by user/service tier
- Audit logging for all queries

### Knowledge Provenance
- Full source tracking
- Version history
- Change attribution

### Retention Policies
- Staging: 30 days TTL (configurable)
- Memories: Permanent until deleted
- Audit logs: 90 days

---

## Future Vision

### Knowledge Graph Visualization
- Interactive exploration of entities and relationships
- Domain knowledge maps
- Gap analysis (what knowledge is missing?)

### Continuous Learning
- Feedback loops from user corrections
- Automatic re-evaluation of low-confidence memories
- Knowledge freshness monitoring

### Multi-Modal Understanding
- Diagram understanding and generation
- Table extraction and reasoning
- Image-to-text-to-knowledge pipelines

### Collaborative Knowledge
- Shared knowledge bases across users
- Knowledge contribution tracking
- Expert review workflows

---

## Appendix: The Power Site Example in Detail

### Step 1: Knowledge Ingestion

```
Domain: power-systems

Sources ingested:
├── Regno Standard v2.1.pdf (248 pages)
├── UK Grid Code 2024.pdf (412 pages)
├── NFPA 855 Fire Safety Standard.pdf (86 pages)
├── Tesla Megapack Datasheet.pdf (12 pages)
├── BYD Battery Cube Specs.pdf (8 pages)
├── ABB Inverter Manual.pdf (156 pages)
├── Site Layout Best Practices (URL)
└── Environmental Assessment Guide (URL)
```

### Step 2: Extracted Knowledge

```
Entities extracted: 847
├── Products: 124 (batteries, inverters, switchgear, etc.)
├── Specifications: 312 (voltages, capacities, dimensions)
├── Regulations: 89 (grid codes, safety standards)
├── Procedures: 156 (installation, commissioning, testing)
└── Concepts: 166 (grid stability, frequency response, etc.)

Relationships mapped: 2,341
├── REQUIRES: 456
├── COMPATIBLE_WITH: 389
├── REGULATES: 234
└── ... other types
```

### Step 3: Query & Response

**Query:**
```
Design a 14MW battery energy storage system for coordinates 51.5074, -0.1278 (London, UK).
Provide: site layout, equipment selection, and compliance checklist.
```

**CORTEX Response:**

```markdown
# 14MW BESS Site Design - London, UK

## 1. Site Layout

Based on the Regno Standard site planning guidelines and UK Grid Code requirements:

```
┌─────────────────────────────────────────────────────────┐
│                    SITE BOUNDARY                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Megapack   │  │  Megapack   │  │  Megapack   │     │
│  │   Unit 1    │  │   Unit 2    │  │   Unit 3    │     │
│  │   3.5MW     │  │   3.5MW     │  │   3.5MW     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                         │
│  ┌─────────────┐  ┌─────────────────────────────┐      │
│  │  Megapack   │  │      SWITCHGEAR             │      │
│  │   Unit 4    │  │      33kV / 400V            │      │
│  │   3.5MW     │  │      MV Transformer         │      │
│  └─────────────┘  └─────────────────────────────┘      │
│                                                         │
│  ┌─────────────────────────────────────────────┐       │
│  │           CONTROL ROOM & SCADA              │       │
│  └─────────────────────────────────────────────┘       │
│                                                         │
│  [ACCESS ROAD]                    [FIRE SUPPRESSION]   │
└─────────────────────────────────────────────────────────┘
```

## 2. Equipment Selection

| Component | Model | Quantity | Specification |
|-----------|-------|----------|---------------|
| Battery System | Tesla Megapack 2XL | 4 | 3.9MWh each, LFP chemistry |
| Inverter | Integrated in Megapack | 4 | 3.5MW AC output |
| Transformer | ABB PowerStar | 1 | 16MVA, 33kV/400V |
| Switchgear | Schneider RM6 | 1 | 36kV, SF6-free |
| SCADA | ABB Ability | 1 | Full site monitoring |

## 3. Compliance Checklist

### UK Grid Code (per Section 10.3.2)
- [ ] Frequency response capability: ±1Hz deadband
- [ ] Fault ride-through: 140ms at 0% voltage
- [ ] Reactive power: ±0.95 power factor

### NFPA 855 (Fire Safety)
- [ ] Minimum spacing: 3m between units
- [ ] Fire detection: Thermal + gas sensors
- [ ] Suppression: Water mist system

### Planning Requirements
- [ ] EIA submitted to local authority
- [ ] Noise assessment: <50dB at boundary
- [ ] Visual impact assessment

---
*Sources: Regno Standard v2.1 (p.45-67), UK Grid Code 2024 (Section 10),
Tesla Megapack Datasheet, NFPA 855 Chapter 4*
```

---

*This document serves as the architectural foundation for the CORTEX Knowledge System.
Last updated: 2024*
