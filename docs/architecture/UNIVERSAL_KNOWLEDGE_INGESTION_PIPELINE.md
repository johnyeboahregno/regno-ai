# Universal Knowledge Ingestion Pipeline

## Overview

A source-agnostic pipeline architecture for ingesting knowledge from any data source and storing it in a multi-database knowledge graph. The system transforms raw content from websites, documents, APIs, and file systems into structured, retrievable knowledge.

## Goals

1. **Ingest from any source** - Web, Google Drive, files, APIs, databases
2. **Extract meaningful content** - Parse and understand the actual information
3. **Structure knowledge** - Organize into concepts, relationships, and chunks
4. **Multi-store persistence** - Leverage MongoDB, Qdrant, and Neo4j for different retrieval patterns

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                        UNIVERSAL KNOWLEDGE INGESTION PIPELINE                           │
└─────────────────────────────────────────────────────────────────────────────────────────┘

     ┌─────────────────────────────────────────────────────────────┐
     │                    1. DATA SOURCES                          │
     │                    (Pluggable Adapters)                     │
     └─────────────────────────────────────────────────────────────┘
                │           │           │           │
        ┌───────┴───┐ ┌─────┴─────┐ ┌───┴───┐ ┌─────┴─────┐
        │  Website  │ │  Google   │ │ Files │ │   APIs    │
        │  Crawler  │ │  Drive    │ │ S3/FS │ │  Notion   │
        └───────────┘ └───────────┘ └───────┘ └───────────┘
                │           │           │           │
                └───────────┴─────┬─────┴───────────┘
                                  │
                                  ▼
     ┌─────────────────────────────────────────────────────────────┐
     │              2. CONTENT NORMALIZATION                       │
     │              (Unified Document Format)                      │
     └─────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
     ┌─────────────────────────────────────────────────────────────┐
     │              3. CONTENT EXTRACTION                          │
     │              (Source-Aware Parsing)                         │
     └─────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
     ┌─────────────────────────────────────────────────────────────┐
     │              4. SEMANTIC ANALYSIS                           │
     │              (LLM-Powered Understanding)                    │
     └─────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
     ┌─────────────────────────────────────────────────────────────┐
     │              5. KNOWLEDGE STRUCTURING                       │
     │              (Graph-Ready Format)                           │
     └─────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
     ┌─────────────────────────────────────────────────────────────┐
     │              6. MULTI-STORE PERSISTENCE                     │
     └─────────────────────────────────────────────────────────────┘
                    │              │              │
            ┌───────┴───────┐ ┌────┴────┐ ┌───────┴───────┐
            │    MongoDB    │ │  Qdrant │ │    Neo4j      │
            │  (Documents)  │ │(Vectors)│ │   (Graph)     │
            └───────────────┘ └─────────┘ └───────────────┘
```

---

## Stage 1: Data Sources (Pluggable Adapters)

Each source type has an adapter that fetches raw content and outputs a normalized format.

### Supported Sources

| Source | Adapter | What It Extracts |
|--------|---------|------------------|
| **Web** | HTTP Crawler | HTML, metadata, links, assets |
| **Google Drive** | GDrive API | Docs, Sheets, PDFs, folder structure |
| **Local Files** | FS Reader | Any file type, directory structure |
| **S3/Cloud** | S3 Client | Objects, metadata, prefixes |
| **Notion** | Notion API | Pages, databases, blocks |
| **Confluence** | Confluence API | Pages, spaces, attachments |
| **GitHub** | GitHub API | Code, READMEs, issues, wikis |
| **Databases** | DB Connector | Schema, records, relationships |

### Adapter Interface

```typescript
interface SourceAdapter {
  sourceType: string;

  // Connect and authenticate
  connect(config: SourceConfig): Promise<void>;

  // List available items
  list(options?: ListOptions): Promise<SourceItem[]>;

  // Fetch single item
  fetch(itemId: string): Promise<NormalizedDocument>;

  // Fetch all (with pagination)
  fetchAll(options?: FetchOptions): AsyncIterator<NormalizedDocument>;
}
```

---

## Stage 2: Content Normalization

After fetching, all content is converted to a unified `NormalizedDocument` format.

### Normalized Document Schema

```typescript
interface NormalizedDocument {
  // Source tracking
  sourceType: 'web' | 'gdrive' | 'file' | 'api' | 'notion' | 'github' | 'database';
  sourceId: string;           // URL, file path, drive ID, etc.
  sourceName: string;         // Human-readable name

  // Content
  mimeType: string;           // text/html, application/pdf, etc.
  rawContent: string | Buffer;
  extractedText: string;      // Plain text version

  // Metadata
  metadata: {
    title?: string;
    author?: string;
    createdAt?: Date;
    modifiedAt?: Date;
    tags?: string[];
    parentFolder?: string;
    permissions?: string[];
    language?: string;
    wordCount?: number;
    [key: string]: any;       // Source-specific metadata
  };

  // Processing hints
  contentHints: {
    language?: string;
    hasCode?: boolean;
    hasTables?: boolean;
    hasImages?: boolean;
    hasFormulas?: boolean;
    estimatedComplexity?: 'low' | 'medium' | 'high';
    suggestedChunkSize?: number;
  };
}
```

### Why Normalization Matters

Once normalized, **the same processing pipeline handles everything**:

```
Web Page      ─┐
Google Doc    ─┼─→ NormalizedDocument ─→ [UNIFIED PIPELINE] ─→ Knowledge Graph
PDF File      ─┤
GitHub Repo   ─┘
```

---

## Stage 3: Content Extraction

Parse the normalized document based on its mime type and extract meaningful content.

### Extraction Strategies by Content Type

| Mime Type | Extraction Strategy |
|-----------|---------------------|
| `text/html` | DOM parsing, main content detection, boilerplate removal |
| `application/pdf` | PDF parsing, OCR for images, table extraction |
| `text/markdown` | Markdown parsing, header hierarchy |
| `application/vnd.google-apps.document` | Google Docs API structure |
| `text/plain` | Paragraph detection, section inference |
| `application/json` | Schema inference, nested structure flattening |
| `text/typescript`, `text/javascript` | AST parsing, JSDoc extraction |
| `text/python` | AST parsing, docstring extraction |

### Extraction Output

```typescript
interface ExtractedContent {
  // Main content
  title: string;
  sections: Section[];

  // Structured elements
  headings: Heading[];
  paragraphs: string[];
  lists: List[];
  tables: Table[];
  codeBlocks: CodeBlock[];
  images: ImageReference[];
  links: Link[];

  // Inferred structure
  tableOfContents: TOCEntry[];
  estimatedReadingTime: number;
}

interface Section {
  id: string;
  heading?: string;
  level: number;
  content: string;
  subsections: Section[];
}
```

---

## Stage 4: Semantic Analysis (LLM-Powered)

Use LLM to understand the content and extract meaningful knowledge.

### Analysis Tasks

1. **Concept Extraction** - Identify defined terms, entities, technical concepts
2. **Relationship Identification** - How concepts relate to each other
3. **Classification** - Type of content (documentation, tutorial, reference, etc.)
4. **Summarization** - Generate concise summaries at multiple levels
5. **Question Generation** - What questions does this content answer?

### Expert System Prompt

```
You are a knowledge extraction specialist. Analyze this document and extract:

1. **CONCEPTS** - Key terms, definitions, entities mentioned
   - For each: name, type, definition, properties, examples

2. **RELATIONSHIPS** - How concepts connect
   - Format: (concept1)-[RELATIONSHIP_TYPE]->(concept2)
   - Types: DEFINES, EXTENDS, IMPLEMENTS, USES, PART_OF, RELATED_TO

3. **FACTS** - Specific assertions that can be stored
   - Verifiable statements from the content

4. **CONTEXT** - What domain/topic does this belong to?

5. **QUESTIONS ANSWERED** - What queries would this content satisfy?

Output as structured JSON:
{
  "concepts": [...],
  "relationships": [...],
  "facts": [...],
  "domain": "...",
  "questionsAnswered": [...]
}
```

### Analysis Output

```typescript
interface SemanticAnalysis {
  concepts: Concept[];
  relationships: Relationship[];
  facts: Fact[];
  domain: string;
  subdomain?: string;
  questionsAnswered: string[];
  confidence: number;
}

interface Concept {
  id: string;
  name: string;
  type: 'entity' | 'interface' | 'class' | 'property' | 'method' | 'enum' | 'term' | 'process';
  definition: string;
  properties?: Property[];
  examples?: string[];
  aliases?: string[];
}

interface Relationship {
  from: string;       // concept id
  type: string;       // EXTENDS, IMPLEMENTS, USES, etc.
  to: string;         // concept id
  context?: string;   // additional context
}
```

---

## Stage 5: Knowledge Structuring

Transform extracted knowledge into graph-ready format with chunks for retrieval.

### Chunking Strategy

```typescript
interface KnowledgeChunk {
  id: string;
  documentId: string;
  sequence: number;           // Order within document

  // Content
  content: string;            // The actual text
  summary: string;            // Brief summary

  // Context
  sectionPath: string[];      // e.g., ["Chapter 1", "Section 1.2"]
  conceptsMentioned: string[];

  // Embedding
  embeddingText: string;      // Text used for embedding (may differ from content)
  embedding?: number[];       // Vector embedding

  // Retrieval metadata
  keywords: string[];
  questionsAnswered: string[];
}
```

### Chunk Size Guidelines

| Content Type | Recommended Chunk Size | Overlap |
|--------------|------------------------|---------|
| Technical docs | 500-800 tokens | 100 tokens |
| Narrative text | 800-1200 tokens | 150 tokens |
| Code | Per function/class | Include signature |
| API reference | Per endpoint/method | Include types |
| Tables | Per table | Include headers |

### Graph Structure Output

```typescript
interface KnowledgeGraphOutput {
  // For MongoDB
  document: {
    id: string;
    sourceType: string;
    sourceId: string;
    title: string;
    fullContent: string;
    metadata: Record<string, any>;
    processedAt: Date;
  };

  chunks: KnowledgeChunk[];

  // For Neo4j
  nodes: {
    concepts: Concept[];
    documents: DocumentNode[];
    chunks: ChunkNode[];
  };

  edges: {
    conceptRelations: Relationship[];
    documentMentions: Mention[];
    chunkSequence: SequenceEdge[];
  };

  // For Qdrant
  embeddings: {
    chunkEmbeddings: EmbeddingRecord[];
    conceptEmbeddings: EmbeddingRecord[];
  };
}
```

---

## Stage 6: Multi-Store Persistence

Write knowledge to three specialized databases for different retrieval patterns.

### MongoDB (Document Store)

**Purpose:** Full content storage, metadata, exact lookups

**Collections:**

```javascript
// documents - Full source documents
{
  _id: ObjectId,
  sourceType: "web",
  sourceId: "https://example.com/page",
  title: "Page Title",
  fullContent: "...",
  extractedText: "...",
  metadata: { author: "...", createdAt: Date },
  processedAt: Date,
  chunkIds: ["chunk_1", "chunk_2"],
  conceptIds: ["concept_1", "concept_2"]
}

// chunks - Retrievable content units
{
  _id: ObjectId,
  documentId: ObjectId,
  sequence: 1,
  content: "...",
  summary: "...",
  sectionPath: ["Chapter 1", "Intro"],
  conceptsMentioned: ["Signal", "Telemetry"],
  keywords: ["api", "data"],
  qdrantPointId: "uuid"
}

// concepts - Knowledge definitions
{
  _id: ObjectId,
  name: "Signal",
  type: "interface",
  definition: "...",
  properties: [...],
  examples: [...],
  sourceDocuments: [ObjectId],
  neo4jNodeId: "uuid"
}

// ingestion_logs - Processing history
{
  _id: ObjectId,
  sourceId: "...",
  status: "completed",
  startedAt: Date,
  completedAt: Date,
  documentsProcessed: 10,
  chunksCreated: 45,
  conceptsExtracted: 23,
  errors: []
}
```

### Qdrant (Vector Store)

**Purpose:** Semantic similarity search, RAG retrieval

**Collections:**

```javascript
// chunk_embeddings
{
  id: "uuid",
  vector: [0.1, 0.2, ...],  // 1536 dimensions for OpenAI
  payload: {
    chunkId: "mongo_id",
    documentId: "mongo_id",
    content: "first 500 chars...",
    summary: "...",
    keywords: ["api", "data"],
    sourceType: "web"
  }
}

// concept_embeddings
{
  id: "uuid",
  vector: [0.1, 0.2, ...],
  payload: {
    conceptId: "mongo_id",
    name: "Signal",
    type: "interface",
    definition: "...",
    domain: "telemetry"
  }
}
```

### Neo4j (Graph Store)

**Purpose:** Relationship traversal, connected knowledge

**Schema:**

```cypher
// Node types
(:Concept {id, name, type, definition})
(:Document {id, sourceType, sourceId, title})
(:Chunk {id, sequence, summary})
(:Entity {id, name, type})  // People, orgs, technologies
(:Tag {id, name, category})
(:Domain {id, name})

// Relationship types
(c1:Concept)-[:EXTENDS]->(c2:Concept)
(c1:Concept)-[:IMPLEMENTS]->(c2:Concept)
(c1:Concept)-[:USES]->(c2:Concept)
(c1:Concept)-[:RELATES_TO]->(c2:Concept)
(c:Concept)-[:DEFINED_IN]->(d:Document)
(ch:Chunk)-[:PART_OF]->(d:Document)
(ch:Chunk)-[:MENTIONS]->(c:Concept)
(ch:Chunk)-[:NEXT]->(ch2:Chunk)
(d:Document)-[:TAGGED_WITH]->(t:Tag)
(d:Document)-[:IN_DOMAIN]->(dom:Domain)
(e:Entity)-[:AUTHORED]->(d:Document)
```

---

## Retrieval Patterns

### Pattern 1: RAG (Semantic Search)

```
User Query: "How do I validate telemetry data?"
    │
    ▼
┌─────────────────────────────────────────┐
│  1. Qdrant: Semantic search             │
│     → Find top 5 similar chunks         │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  2. MongoDB: Fetch full chunks          │
│     → Get complete content              │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  3. LLM: Synthesize answer              │
│     → Use chunks as context             │
└─────────────────────────────────────────┘
```

### Pattern 2: Graph Traversal

```
Query: "What interfaces extend BaseEntity?"
    │
    ▼
┌─────────────────────────────────────────┐
│  1. Neo4j: Graph query                  │
│     MATCH (c:Concept)-[:EXTENDS]->      │
│           (:Concept {name: 'BaseEntity'})│
│     RETURN c                            │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  2. MongoDB: Fetch full definitions     │
│     → Get complete concept details      │
└─────────────────────────────────────────┘
```

### Pattern 3: Hybrid (Graph + Semantic)

```
Query: "Explain Signal and all related concepts"
    │
    ▼
┌─────────────────────────────────────────┐
│  1. Neo4j: Find related concepts        │
│     MATCH (c:Concept {name: 'Signal'})  │
│           -[r]-(related)                │
│     RETURN related, type(r)             │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  2. Qdrant: Find relevant chunks        │
│     → For each related concept          │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  3. MongoDB: Fetch all content          │
│     → Concepts + chunks                 │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  4. LLM: Comprehensive synthesis        │
│     → Rich, connected explanation       │
└─────────────────────────────────────────┘
```

---

## Pipeline Node Configuration

### Node 1: Data Source Adapter

```yaml
type: data-source
config:
  sourceType: web | gdrive | file | api
  connection:
    # Source-specific config
  output:
    format: normalized-document
```

### Node 2: Content Extractor

```yaml
type: expert
config:
  systemPrompt: |
    Extract content from this document...
  outputFormat: extracted-content
```

### Node 3: Semantic Analyzer

```yaml
type: expert
config:
  model: gpt-4
  systemPrompt: |
    Analyze this content and extract concepts, relationships...
  outputFormat: semantic-analysis
```

### Node 4: Knowledge Structurer

```yaml
type: mapper
config:
  operations:
    - chunk content
    - generate embeddings
    - build graph nodes/edges
  outputFormat: knowledge-graph-output
```

### Node 5: Multi-Store Sink

```yaml
type: data-sink
config:
  targets:
    - type: mongodb
      collections: [documents, chunks, concepts]
    - type: qdrant
      collections: [chunk_embeddings, concept_embeddings]
    - type: neo4j
      operations: [create-nodes, create-edges]
```

---

## Example: Regno Standard Ingestion

### Input
```
Source: https://regnostandard.com
Type: Web crawler
Pages: 5 documentation pages
```

### Processing Flow

```
1. CRAWL
   └─→ 5 HTML pages fetched

2. NORMALIZE
   └─→ 5 NormalizedDocuments created

3. EXTRACT
   └─→ Content parsed, structure identified
   └─→ 12 sections, 3 code blocks, 2 tables

4. ANALYZE
   └─→ 8 concepts identified (Signal, Packet, Validator, etc.)
   └─→ 15 relationships mapped
   └─→ Domain: "telemetry-standards"

5. STRUCTURE
   └─→ 23 chunks created
   └─→ 23 embeddings generated
   └─→ Graph with 8 nodes, 15 edges

6. PERSIST
   └─→ MongoDB: 5 documents, 23 chunks, 8 concepts
   └─→ Qdrant: 31 embeddings
   └─→ Neo4j: 8 concept nodes, 5 document nodes, 15 relationships
```

### Result

Cortex can now answer:
- "What is the Signal interface?" → Direct concept lookup
- "How does telemetry validation work?" → Semantic search + synthesis
- "What concepts are related to Packet?" → Graph traversal
- "Explain the Regno Standard architecture" → Full knowledge synthesis

---

## Implementation Checklist

- [ ] Source adapters for each input type
- [ ] Normalized document schema validation
- [ ] Content extraction per mime type
- [ ] LLM prompts for semantic analysis
- [ ] Chunking strategies per content type
- [ ] Embedding generation pipeline
- [ ] MongoDB collections and indexes
- [ ] Qdrant collections and configuration
- [ ] Neo4j schema and constraints
- [ ] Multi-store sink node
- [ ] Retrieval API endpoints
- [ ] Monitoring and logging

---

## Related Documentation

- [Cortex Brain Architecture](./cortex_brain_architecture.md)
- [MongoDB Registry Architecture](../mongodb_registry_architecture.md)
- [Stage V2 Architecture](./stage_v2_architecture.md)
