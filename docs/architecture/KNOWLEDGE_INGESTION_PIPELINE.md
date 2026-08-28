# Knowledge Ingestion Pipeline Architecture

> **Purpose**: A reusable pipeline for ingesting external knowledge from URLs, files, and APIs into the CORTEX intelligence layer for expert-level understanding and retrieval.

---

## Overview

The Knowledge Ingestion Pipeline enables Regno.ai to:
1. **Acquire** content from various sources (URLs, files, APIs)
2. **Analyze** and understand content using AI Expert nodes
3. **Structure** knowledge into graphs, vectors, and documents
4. **Retrieve** information to answer queries or generate documentation

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        KNOWLEDGE INGESTION PIPELINE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   SOURCE     │───▶│   EXTRACT    │───▶│   ANALYZE    │                  │
│  │  ACQUISITION │    │   CONTENT    │    │   (AI/LLM)   │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│         │                   │                   │                           │
│         ▼                   ▼                   ▼                           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │  - URLs      │    │  - HTML→MD   │    │  - Expert    │                  │
│  │  - Files     │    │  - PDF→Text  │    │    Nodes     │                  │
│  │  - APIs      │    │  - JSON→Obj  │    │  - Summarize │                  │
│  │  - Uploads   │    │  - Images    │    │  - Structure │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│                                                 │                           │
│                      ┌──────────────────────────┴────────────┐              │
│                      │           CORTEX LAYER                │              │
│                      ├───────────────────────────────────────┤              │
│                      │                                       │              │
│                      │  ┌─────────┐  ┌─────────┐  ┌───────┐  │              │
│                      │  │ MongoDB │  │ Qdrant  │  │ Neo4j │  │              │
│                      │  │Documents│  │ Vectors │  │ Graph │  │              │
│                      │  └─────────┘  └─────────┘  └───────┘  │              │
│                      │                                       │              │
│                      └───────────────────────────────────────┘              │
│                                         │                                   │
│                      ┌──────────────────┴──────────────────┐                │
│                      │          RETRIEVAL LAYER            │                │
│                      ├─────────────────────────────────────┤                │
│                      │  - Answer Queries                   │                │
│                      │  - Generate Documentation           │                │
│                      │  - Find Related Concepts            │                │
│                      │  - RAG-Augmented Responses          │                │
│                      └─────────────────────────────────────┘                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Pipeline Stages

### Stage 1: Source Acquisition

**Node Type**: `knowledge-source`

Handles multiple input types:

| Source | Method | Output |
|--------|--------|--------|
| URL | HTTP fetch, render JS | Raw HTML/content |
| File Upload | Parse multipart | File content |
| API | REST/GraphQL call | JSON response |
| Sitemap | Crawl sitemap.xml | Multiple pages |
| RSS/Atom | Feed parsing | Article list |

**Configuration**:
```typescript
interface KnowledgeSourceConfig {
  sourceType: 'url' | 'file' | 'api' | 'sitemap' | 'rss';
  url?: string;
  apiConfig?: {
    method: 'GET' | 'POST';
    headers: Record<string, string>;
    body?: any;
  };
  crawlDepth?: number;  // For sitemap/link following
  rateLimit?: number;   // Requests per second
}
```

### Stage 2: Content Extraction

**Node Type**: `content-extractor`

Converts raw content to structured text:

| Format | Extractor | Output |
|--------|-----------|--------|
| HTML | Readability + Cheerio | Markdown |
| PDF | pdf-parse | Text + metadata |
| DOCX | mammoth | HTML → Markdown |
| JSON | Direct parse | Structured object |
| Images | OCR (Tesseract) | Extracted text |
| Video | Whisper API | Transcript |

**Configuration**:
```typescript
interface ContentExtractorConfig {
  format: 'auto' | 'html' | 'pdf' | 'docx' | 'json' | 'image' | 'video';
  extractImages: boolean;
  preserveFormatting: boolean;
  splitByHeadings: boolean;
  chunkSize?: number;  // For vector embedding
}
```

### Stage 3: AI Analysis

**Node Type**: `expert` (existing)

Uses Expert nodes for deep understanding:

1. **Summarization**: Create executive summary
2. **Entity Extraction**: Identify key concepts, terms, relationships
3. **Structure Discovery**: Understand document organization
4. **Terminology Building**: Build glossary of domain terms
5. **Fact Extraction**: Extract verifiable statements

**Expert Prompts**:
```typescript
const analysisPrompts = {
  summarize: `Analyze this content and provide:
    1. Executive summary (2-3 paragraphs)
    2. Key topics covered
    3. Main takeaways
    4. Target audience`,

  entities: `Extract all important entities:
    - Concepts and definitions
    - People/organizations mentioned
    - Technical terms
    - Relationships between entities`,

  structure: `Analyze the document structure:
    - Main sections and their purposes
    - Hierarchy of information
    - Dependencies between sections`
};
```

### Stage 4: CORTEX Ingestion

**Multi-Store Architecture**:

#### MongoDB (Document Store)
```typescript
interface KnowledgeDocument {
  _id: ObjectId;
  sourceUrl?: string;
  sourceType: string;
  title: string;
  content: string;
  markdown: string;
  summary: string;
  entities: Entity[];
  metadata: {
    author?: string;
    publishedDate?: Date;
    lastModified?: Date;
    language: string;
    wordCount: number;
  };
  chunks: ChunkReference[];
  createdAt: Date;
  updatedAt: Date;
  domain: string;  // e.g., 'regno-standard', 'telemetry', etc.
}
```

#### Qdrant (Vector Store)
```typescript
interface KnowledgeVector {
  id: string;
  vector: number[];  // OpenAI embeddings (1536 dims)
  payload: {
    documentId: string;
    chunkIndex: number;
    text: string;
    title: string;
    domain: string;
    entities: string[];
  };
}
```

#### Neo4j (Graph Store)
```cypher
// Nodes
(:Domain {name, description})
(:Document {id, title, url, summary})
(:Concept {name, definition, domain})
(:Entity {name, type, description})

// Relationships
(:Document)-[:BELONGS_TO]->(:Domain)
(:Document)-[:MENTIONS]->(:Concept)
(:Document)-[:REFERENCES]->(:Document)
(:Concept)-[:RELATED_TO]->(:Concept)
(:Entity)-[:DEFINED_IN]->(:Document)
```

### Stage 5: Retrieval

**Query Types**:

| Query Type | Method | Use Case |
|------------|--------|----------|
| Semantic Search | Qdrant similarity | "Find docs about X" |
| Exact Match | MongoDB text index | Specific terms |
| Graph Traversal | Neo4j Cypher | Related concepts |
| RAG | Vector + LLM | Answer questions |

---

## Implementation Plan

### Phase 1: Core Infrastructure

1. **KnowledgeSourceNode**
   - URL fetching with retry logic
   - File upload handling
   - Sitemap crawling

2. **ContentExtractorNode**
   - HTML to Markdown conversion
   - PDF text extraction
   - Chunking for embeddings

3. **KnowledgeIngestionService**
   - MongoDB schema and operations
   - Qdrant collection management
   - Neo4j graph operations

### Phase 2: AI Analysis

4. **Expert Node Integration**
   - Specialized prompts for knowledge extraction
   - Entity recognition pipeline
   - Relationship inference

5. **Embedding Pipeline**
   - OpenAI embeddings integration
   - Batch processing for large documents
   - Incremental updates

### Phase 3: Retrieval Layer

6. **QueryEngine**
   - Semantic search across vectors
   - Graph-based exploration
   - RAG-augmented answers

7. **DocumentGenerator**
   - Generate documentation from knowledge base
   - Export to Markdown/HTML
   - Citation tracking

---

## Skill Definition

```typescript
const knowledgeIngestionSkill: Skill = {
  id: 'knowledge-ingestion',
  name: 'Knowledge Ingestion Pipeline',
  description: 'Ingest external knowledge from URLs, files, and APIs into the CORTEX intelligence layer',
  category: 'research',

  triggers: [
    'research this topic',
    'learn about',
    'ingest documentation from',
    'understand this standard',
    'study this specification'
  ],

  pipeline: {
    nodes: [
      { type: 'knowledge-source', name: 'Source Acquisition' },
      { type: 'content-extractor', name: 'Content Extraction' },
      { type: 'expert', name: 'AI Analysis', config: { prompt: 'analyze' } },
      { type: 'expert', name: 'Entity Extraction', config: { prompt: 'entities' } },
      { type: 'knowledge-sink', name: 'CORTEX Ingestion' }
    ]
  },

  outputs: {
    summary: 'string',
    entities: 'Entity[]',
    documentId: 'string',
    graphNodeCount: 'number'
  }
};
```

---

## CORTEX Patterns

New patterns for knowledge ingestion domain:

```typescript
const knowledgeIngestionPatterns = [
  {
    domain: 'knowledge_ingestion',
    patternType: 'source_detection',
    name: 'URL Source Pattern',
    trigger: 'url|website|webpage|link',
    action: 'configure_http_source'
  },
  {
    domain: 'knowledge_ingestion',
    patternType: 'content_type',
    name: 'Documentation Pattern',
    trigger: 'docs|documentation|manual|guide|specification',
    action: 'enable_structure_extraction'
  },
  {
    domain: 'knowledge_ingestion',
    patternType: 'analysis_depth',
    name: 'Expert Analysis Pattern',
    trigger: 'understand|expert|comprehensive',
    action: 'enable_deep_analysis'
  }
];
```

---

## Example Usage

### 1. Ingest from URL
```
User: "Research the Regno Standard from regnostandard.com"

Pipeline:
1. Fetch all pages from sitemap
2. Extract content to markdown
3. AI summarizes each page
4. Extract entities (document types, fields, conventions)
5. Store in MongoDB, embed in Qdrant, link in Neo4j
```

### 2. Query Knowledge Base
```
User: "What is a ParamSamplesDoc?"

Retrieval:
1. Semantic search in Qdrant
2. Find related concepts in Neo4j
3. RAG response with citations
```

### 3. Generate Documentation
```
User: "Generate complete documentation for Regno Standard"

Output:
1. Query all documents in domain
2. Organize by graph structure
3. Generate Markdown with cross-references
4. Export to /doc/regno-standard/
```

---

## Next Steps

1. [ ] Implement `KnowledgeSourceNode` for URL/file acquisition
2. [ ] Implement `ContentExtractorNode` for format conversion
3. [ ] Create `KnowledgeIngestionService` for CORTEX storage
4. [ ] Add embedding pipeline for Qdrant
5. [ ] Create Neo4j knowledge graph schema
6. [ ] Implement retrieval query engine
7. [ ] Create skill definition and CORTEX patterns
8. [ ] Build documentation generator

---

## Related Documentation

- [CORTEX Brain Architecture](./CORTEX_BRAIN_IMPLEMENTATION_COMPLETE.md)
- [Skills Architecture](./SKILLS_ARCHITECTURE.md)
- [Regno Standard](../regno-standard/OVERVIEW.md)
