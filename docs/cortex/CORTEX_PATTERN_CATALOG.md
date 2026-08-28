# CORTEX Pattern Catalog
## Foundation Patterns for Regno.AI Learning System

**Version:** 1.0
**Last Updated:** 2025-11-23
**Total Patterns:** 82 foundational patterns

---

## Pattern Categories

1. [Pipeline Architectures](#1-pipeline-architectures) - 15 patterns (Priority: HIGH)
2. [AI Composition Patterns](#2-ai-composition-patterns) - 12 patterns (Priority: HIGH)
3. [Data Transformation](#3-data-transformation-patterns) - 10 patterns (Priority: MEDIUM)
4. [Application Workflows](#4-application-workflows) - 14 patterns (Priority: HIGH)
5. [Error Recovery](#5-error-recovery-patterns) - 8 patterns (Priority: CRITICAL)
6. [LLM Prompt Templates](#6-llm-prompt-templates) - 10 patterns (Priority: MEDIUM)
7. [System Configuration](#7-system-configuration-patterns) - 5 patterns (Priority: CRITICAL)
8. [Performance Optimization](#8-performance-optimization-patterns) - 8 patterns (Priority: MEDIUM)

---

## Pattern Structure

Each pattern includes:
- **ID**: Unique identifier
- **Name**: Human-readable name
- **Category**: Primary category
- **Priority**: CRITICAL | HIGH | MEDIUM | LOW
- **Foundation**: true/false (cannot be deleted without flag removal)
- **Sticky**: true/false (pinned in UI, frequently used)
- **Confidence**: 0.0-1.0 (pattern reliability)
- **Description**: What this pattern does
- **Node Sequence**: Array of node types
- **Use Cases**: When to apply this pattern
- **Success Criteria**: Expected outcomes
- **Cost Profile**: Token usage and computational cost
- **Metadata**: Additional context

---

## 1. Pipeline Architectures

### PA-001: MongoDB Aggregation Visualization
```json
{
  "id": "PA-001",
  "name": "MongoDB Aggregation Visualization",
  "category": "pipeline-architecture",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.95,
  "description": "Standard pattern for aggregating MongoDB data and visualizing with D3 charts",
  "nodeSequence": ["data-source", "aggregation", "chart"],
  "edgeCount": 2,
  "useCases": [
    "Time-series data visualization",
    "Sales analytics dashboards",
    "System metrics monitoring"
  ],
  "successCriteria": {
    "dataVolume": "10-100K records",
    "responseTime": "< 5s",
    "visualClarity": "high"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "low",
    "storageCost": "minimal"
  },
  "metadata": {
    "typicalAggregations": ["sum", "avg", "count", "group"],
    "chartTypes": ["line", "bar", "area"],
    "complexity": "low",
    "maintainability": "high"
  }
}
```

### PA-002: RAG Knowledge Retrieval
```json
{
  "id": "PA-002",
  "name": "RAG Knowledge Retrieval",
  "category": "pipeline-architecture",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.92,
  "description": "Retrieval-Augmented Generation pattern for semantic search and LLM-enhanced responses",
  "nodeSequence": ["data-source", "lookup", "llm", "mapper"],
  "edgeCount": 3,
  "useCases": [
    "Knowledge base search",
    "Document Q&A systems",
    "Context-aware chatbots"
  ],
  "successCriteria": {
    "retrievalAccuracy": "> 0.85",
    "responseQuality": "high",
    "latency": "< 10s"
  },
  "costProfile": {
    "llmTokens": 2000,
    "computeCost": "medium",
    "storageCost": "low"
  },
  "metadata": {
    "embeddingModel": "text-embedding-3-large",
    "llmModel": "gpt-4o",
    "vectorDbRequired": true,
    "complexity": "medium"
  }
}
```

### PA-003: Real-time Data Streaming
```json
{
  "id": "PA-003",
  "name": "Real-time Data Streaming",
  "category": "pipeline-architecture",
  "priority": "HIGH",
  "foundation": true,
  "sticky": false,
  "confidence": 0.88,
  "description": "Continuous data ingestion and live visualization pipeline",
  "nodeSequence": ["webhook", "buffer", "transform", "chart"],
  "edgeCount": 3,
  "useCases": [
    "IoT sensor monitoring",
    "Live analytics dashboards",
    "System health monitoring"
  ],
  "successCriteria": {
    "throughput": "> 100 records/sec",
    "latency": "< 1s",
    "reliability": "> 0.99"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "medium",
    "storageCost": "medium"
  },
  "metadata": {
    "bufferSize": 1000,
    "streamingType": "push",
    "complexity": "medium"
  }
}
```

### PA-004: ETL Data Pipeline
```json
{
  "id": "PA-004",
  "name": "ETL Data Pipeline",
  "category": "pipeline-architecture",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.93,
  "description": "Extract, Transform, Load pattern for data migration and synchronization",
  "nodeSequence": ["data-source", "transform", "mapper", "data-sink"],
  "edgeCount": 3,
  "useCases": [
    "Database migration",
    "Data warehouse loading",
    "System integration"
  ],
  "successCriteria": {
    "dataIntegrity": "100%",
    "transformationAccuracy": "> 0.99",
    "performance": "bulk optimized"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "low",
    "storageCost": "high"
  },
  "metadata": {
    "batchSize": 500,
    "transactional": true,
    "complexity": "low"
  }
}
```

### PA-005: Multi-Source Data Enrichment
```json
{
  "id": "PA-005",
  "name": "Multi-Source Data Enrichment",
  "category": "pipeline-architecture",
  "priority": "HIGH",
  "foundation": true,
  "sticky": false,
  "confidence": 0.90,
  "description": "Combine data from multiple sources and enrich with lookups",
  "nodeSequence": ["data-source", "lookup", "http", "mapper", "data-sink"],
  "edgeCount": 4,
  "useCases": [
    "Customer data enrichment",
    "Product catalog enhancement",
    "Lead qualification"
  ],
  "successCriteria": {
    "enrichmentRate": "> 0.80",
    "dataQuality": "high",
    "matchAccuracy": "> 0.85"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "medium",
    "storageCost": "medium"
  },
  "metadata": {
    "sourceCount": 3,
    "lookupStrategy": "cached",
    "complexity": "medium"
  }
}
```

### PA-006: Conditional Data Routing
```json
{
  "id": "PA-006",
  "name": "Conditional Data Routing",
  "category": "pipeline-architecture",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": false,
  "confidence": 0.91,
  "description": "Route data to different processing paths based on rules",
  "nodeSequence": ["data-source", "rules", "mapper", "data-sink"],
  "edgeCount": 4,
  "useCases": [
    "Priority-based processing",
    "Error handling workflows",
    "Smart routing systems"
  ],
  "successCriteria": {
    "routingAccuracy": "> 0.95",
    "ruleEvaluation": "fast",
    "coverage": "complete"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "low",
    "storageCost": "low"
  },
  "metadata": {
    "ruleComplexity": "medium",
    "branchCount": 3,
    "complexity": "medium"
  }
}
```

### PA-007: AI-Driven Data Classification
```json
{
  "id": "PA-007",
  "name": "AI-Driven Data Classification",
  "category": "pipeline-architecture",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.87,
  "description": "Use LLM to classify and categorize incoming data",
  "nodeSequence": ["data-source", "llm", "mapper", "data-sink"],
  "edgeCount": 3,
  "useCases": [
    "Email categorization",
    "Support ticket routing",
    "Content moderation"
  ],
  "successCriteria": {
    "classificationAccuracy": "> 0.90",
    "consistency": "high",
    "throughput": "> 50 items/min"
  },
  "costProfile": {
    "llmTokens": 500,
    "computeCost": "medium",
    "storageCost": "low"
  },
  "metadata": {
    "llmModel": "gpt-4o-mini",
    "categories": "dynamic",
    "complexity": "medium"
  }
}
```

### PA-008: Batch Processing with Insights
```json
{
  "id": "PA-008",
  "name": "Batch Processing with Insights",
  "category": "pipeline-architecture",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": false,
  "confidence": 0.89,
  "description": "Process large datasets in batches and generate AI insights",
  "nodeSequence": ["data-source", "aggregation", "insight", "data-sink"],
  "edgeCount": 3,
  "useCases": [
    "Daily analytics reports",
    "Trend analysis",
    "Anomaly detection"
  ],
  "successCriteria": {
    "batchCompleteness": "100%",
    "insightQuality": "high",
    "automation": "complete"
  },
  "costProfile": {
    "llmTokens": 3000,
    "computeCost": "high",
    "storageCost": "medium"
  },
  "metadata": {
    "batchSize": 10000,
    "insightDepth": "comprehensive",
    "complexity": "high"
  }
}
```

### PA-009: Webhook-Triggered Automation
```json
{
  "id": "PA-009",
  "name": "Webhook-Triggered Automation",
  "category": "pipeline-architecture",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.94,
  "description": "Event-driven pipeline triggered by external webhooks",
  "nodeSequence": ["webhook", "rules", "http", "data-sink"],
  "edgeCount": 3,
  "useCases": [
    "Slack integration",
    "API automation",
    "Event-driven workflows"
  ],
  "successCriteria": {
    "reliability": "> 0.99",
    "responseTime": "< 2s",
    "errorHandling": "robust"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "low",
    "storageCost": "minimal"
  },
  "metadata": {
    "triggerType": "push",
    "authentication": "required",
    "complexity": "low"
  }
}
```

### PA-010: Scheduled Data Aggregation
```json
{
  "id": "PA-010",
  "name": "Scheduled Data Aggregation",
  "category": "pipeline-architecture",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": false,
  "confidence": 0.92,
  "description": "Periodic aggregation and reporting pipeline",
  "nodeSequence": ["data-source", "aggregation", "mapper", "data-sink"],
  "edgeCount": 3,
  "useCases": [
    "Daily reports",
    "Scheduled analytics",
    "Data warehousing"
  ],
  "successCriteria": {
    "reliability": "100%",
    "consistency": "high",
    "timeliness": "on-schedule"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "low",
    "storageCost": "medium"
  },
  "metadata": {
    "frequency": "daily",
    "timezone": "UTC",
    "complexity": "low"
  }
}
```

### PA-011: Interactive Data Exploration
```json
{
  "id": "PA-011",
  "name": "Interactive Data Exploration",
  "category": "pipeline-architecture",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": false,
  "confidence": 0.86,
  "description": "User-driven data exploration with grid and charts",
  "nodeSequence": ["data-source", "data-grid", "chart"],
  "edgeCount": 2,
  "useCases": [
    "Data analysis",
    "Ad-hoc reporting",
    "Business intelligence"
  ],
  "successCriteria": {
    "interactivity": "high",
    "dataFreshness": "real-time",
    "visualQuality": "high"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "low",
    "storageCost": "low"
  },
  "metadata": {
    "maxRecords": 5000,
    "refreshable": true,
    "complexity": "low"
  }
}
```

### PA-012: AI Content Generation
```json
{
  "id": "PA-012",
  "name": "AI Content Generation",
  "category": "pipeline-architecture",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.85,
  "description": "Generate content using LLM based on structured data",
  "nodeSequence": ["data-source", "mapper", "llm", "data-sink"],
  "edgeCount": 3,
  "useCases": [
    "Email generation",
    "Report writing",
    "Content creation"
  ],
  "successCriteria": {
    "contentQuality": "high",
    "relevance": "> 0.90",
    "creativity": "balanced"
  },
  "costProfile": {
    "llmTokens": 2000,
    "computeCost": "high",
    "storageCost": "low"
  },
  "metadata": {
    "llmModel": "gpt-4o",
    "temperature": 0.7,
    "complexity": "medium"
  }
}
```

### PA-013: Multi-Stage Expert Consultation
```json
{
  "id": "PA-013",
  "name": "Multi-Stage Expert Consultation",
  "category": "pipeline-architecture",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.83,
  "description": "Chain multiple expert nodes for deep analysis",
  "nodeSequence": ["data-source", "expert", "expert", "mapper", "data-sink"],
  "edgeCount": 4,
  "useCases": [
    "Complex decision making",
    "Multi-perspective analysis",
    "Expert review workflows"
  ],
  "successCriteria": {
    "analysisDepth": "comprehensive",
    "expertAgreement": "> 0.75",
    "insightQuality": "exceptional"
  },
  "costProfile": {
    "llmTokens": 8000,
    "computeCost": "very high",
    "storageCost": "medium"
  },
  "metadata": {
    "expertCount": 2,
    "consultationType": "sequential",
    "complexity": "very high"
  }
}
```

### PA-014: Hybrid Human-AI Workflow
```json
{
  "id": "PA-014",
  "name": "Hybrid Human-AI Workflow",
  "category": "pipeline-architecture",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": false,
  "confidence": 0.81,
  "description": "Combine AI automation with human review checkpoints",
  "nodeSequence": ["data-source", "llm", "console", "mapper", "data-sink"],
  "edgeCount": 4,
  "useCases": [
    "Content moderation",
    "Quality assurance",
    "Approval workflows"
  ],
  "successCriteria": {
    "automationRate": "> 0.80",
    "humanReviewQuality": "high",
    "efficiency": "optimized"
  },
  "costProfile": {
    "llmTokens": 1500,
    "computeCost": "medium",
    "storageCost": "low"
  },
  "metadata": {
    "reviewTrigger": "confidence < 0.8",
    "humanInTheLoop": true,
    "complexity": "high"
  }
}
```

### PA-015: MAESTRO Auto-Pipeline
```json
{
  "id": "PA-015",
  "name": "MAESTRO Auto-Pipeline",
  "category": "pipeline-architecture",
  "priority": "CRITICAL",
  "foundation": true,
  "sticky": true,
  "confidence": 0.78,
  "description": "Let MAESTRO automatically design and build the pipeline",
  "nodeSequence": ["maestro"],
  "edgeCount": 0,
  "useCases": [
    "Unknown problem spaces",
    "Rapid prototyping",
    "Complex orchestration"
  ],
  "successCriteria": {
    "pipelineValidity": "> 0.85",
    "goalachievement": "> 0.80",
    "efficiency": "high"
  },
  "costProfile": {
    "llmTokens": 15000,
    "computeCost": "very high",
    "storageCost": "medium"
  },
  "metadata": {
    "phases": 6,
    "iterative": true,
    "complexity": "very high"
  }
}
```

---

## 2. AI Composition Patterns

### AI-001: Expert Q&A with Memory
```json
{
  "id": "AI-001",
  "name": "Expert Q&A with Memory",
  "category": "ai-composition",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.91,
  "description": "Expert consultation with conversation memory for context retention",
  "nodeSequence": ["memory", "expert", "memory"],
  "edgeCount": 2,
  "useCases": [
    "Multi-turn consultations",
    "Contextual analysis",
    "Iterative refinement"
  ],
  "successCriteria": {
    "contextRetention": "> 0.90",
    "responseQuality": "high",
    "coherence": "excellent"
  },
  "costProfile": {
    "llmTokens": 3000,
    "computeCost": "medium",
    "storageCost": "low"
  }
}
```

### AI-002: Agent with Tools
```json
{
  "id": "AI-002",
  "name": "Agent with Tools",
  "category": "ai-composition",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.88,
  "description": "AI agent with access to external tools and APIs",
  "nodeSequence": ["agent", "http", "mapper"],
  "edgeCount": 2,
  "useCases": [
    "API automation",
    "Data fetching",
    "Tool orchestration"
  ],
  "successCriteria": {
    "toolUsageAccuracy": "> 0.85",
    "taskCompletion": "> 0.90",
    "efficiency": "high"
  },
  "costProfile": {
    "llmTokens": 2500,
    "computeCost": "high",
    "storageCost": "low"
  }
}
```

### AI-003: LLM Chain
```json
{
  "id": "AI-003",
  "name": "LLM Chain",
  "category": "ai-composition",
  "priority": "HIGH",
  "foundation": true,
  "sticky": false,
  "confidence": 0.86,
  "description": "Chain multiple LLM calls for complex reasoning",
  "nodeSequence": ["llm", "mapper", "llm", "mapper"],
  "edgeCount": 3,
  "useCases": [
    "Multi-step reasoning",
    "Content refinement",
    "Iterative improvement"
  ],
  "successCriteria": {
    "reasoningDepth": "deep",
    "outputQuality": "refined",
    "coherence": "high"
  },
  "costProfile": {
    "llmTokens": 5000,
    "computeCost": "high",
    "storageCost": "low"
  }
}
```

### AI-004: Insight Generator
```json
{
  "id": "AI-004",
  "name": "Insight Generator",
  "category": "ai-composition",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.92,
  "description": "Generate AI insights from aggregated time-series data",
  "nodeSequence": ["aggregation", "insight", "mapper"],
  "edgeCount": 2,
  "useCases": [
    "Business analytics",
    "Trend analysis",
    "Anomaly detection"
  ],
  "successCriteria": {
    "insightRelevance": "> 0.90",
    "actionability": "high",
    "freshness": "real-time"
  },
  "costProfile": {
    "llmTokens": 2000,
    "computeCost": "medium",
    "storageCost": "low"
  }
}
```

### AI-005: MAESTRO with Iteration
```json
{
  "id": "AI-005",
  "name": "MAESTRO with Iteration",
  "category": "ai-composition",
  "priority": "CRITICAL",
  "foundation": true,
  "sticky": true,
  "confidence": 0.84,
  "description": "MAESTRO orchestration with iterative refinement enabled",
  "nodeSequence": ["maestro"],
  "edgeCount": 0,
  "useCases": [
    "Complex problem solving",
    "Adaptive workflows",
    "Self-improving pipelines"
  ],
  "successCriteria": {
    "convergence": "< 5 iterations",
    "qualityImprovement": "> 0.20",
    "efficiency": "optimized"
  },
  "costProfile": {
    "llmTokens": 20000,
    "computeCost": "very high",
    "storageCost": "high"
  }
}
```

### AI-006: Multi-Expert Consensus
```json
{
  "id": "AI-006",
  "name": "Multi-Expert Consensus",
  "category": "ai-composition",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": false,
  "confidence": 0.79,
  "description": "Multiple experts with aggregation for consensus",
  "nodeSequence": ["expert", "expert", "expert", "aggregation", "mapper"],
  "edgeCount": 4,
  "useCases": [
    "Critical decisions",
    "Risk assessment",
    "Quality assurance"
  ],
  "successCriteria": {
    "expertAgreement": "> 0.70",
    "confidenceLevel": "high",
    "biasReduction": "significant"
  },
  "costProfile": {
    "llmTokens": 12000,
    "computeCost": "very high",
    "storageCost": "medium"
  }
}
```

### AI-007: RAG with Fallback
```json
{
  "id": "AI-007",
  "name": "RAG with Fallback",
  "category": "ai-composition",
  "priority": "HIGH",
  "foundation": true,
  "sticky": false,
  "confidence": 0.87,
  "description": "RAG with fallback to general knowledge when lookup fails",
  "nodeSequence": ["lookup", "rules", "llm", "mapper"],
  "edgeCount": 3,
  "useCases": [
    "Knowledge base Q&A",
    "Hybrid information retrieval",
    "Robust question answering"
  ],
  "successCriteria": {
    "answerCompleteness": "> 0.90",
    "fallbackRate": "< 0.20",
    "accuracy": "high"
  },
  "costProfile": {
    "llmTokens": 2500,
    "computeCost": "medium",
    "storageCost": "low"
  }
}
```

### AI-008: Code-Enhanced AI
```json
{
  "id": "AI-008",
  "name": "Code-Enhanced AI",
  "category": "ai-composition",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": false,
  "confidence": 0.82,
  "description": "Combine custom code logic with AI reasoning",
  "nodeSequence": ["code", "llm", "mapper"],
  "edgeCount": 2,
  "useCases": [
    "Custom transformations",
    "Business logic + AI",
    "Hybrid processing"
  ],
  "successCriteria": {
    "codeReliability": "100%",
    "aiEnhancement": "significant",
    "performance": "optimized"
  },
  "costProfile": {
    "llmTokens": 1500,
    "computeCost": "medium",
    "storageCost": "low"
  }
}
```

### AI-009: Buffered AI Processing
```json
{
  "id": "AI-009",
  "name": "Buffered AI Processing",
  "category": "ai-composition",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": false,
  "confidence": 0.85,
  "description": "Buffer data before AI processing for batch efficiency",
  "nodeSequence": ["buffer", "llm", "mapper"],
  "edgeCount": 2,
  "useCases": [
    "Batch AI processing",
    "Cost optimization",
    "Rate limiting"
  ],
  "successCriteria": {
    "batchEfficiency": "> 0.80",
    "costReduction": "> 0.40",
    "throughput": "optimized"
  },
  "costProfile": {
    "llmTokens": 3000,
    "computeCost": "medium",
    "storageCost": "low"
  }
}
```

### AI-010: Sentiment-Driven Routing
```json
{
  "id": "AI-010",
  "name": "Sentiment-Driven Routing",
  "category": "ai-composition",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.89,
  "description": "Analyze sentiment and route accordingly",
  "nodeSequence": ["llm", "rules", "mapper"],
  "edgeCount": 2,
  "useCases": [
    "Customer support",
    "Email triage",
    "Escalation management"
  ],
  "successCriteria": {
    "sentimentAccuracy": "> 0.85",
    "routingPrecision": "> 0.90",
    "responseTime": "fast"
  },
  "costProfile": {
    "llmTokens": 800,
    "computeCost": "low",
    "storageCost": "minimal"
  }
}
```

### AI-011: MCP Service Integration
```json
{
  "id": "AI-011",
  "name": "MCP Service Integration",
  "category": "ai-composition",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": false,
  "confidence": 0.80,
  "description": "Integrate Model Context Protocol services with AI workflows",
  "nodeSequence": ["mcp", "llm", "mapper"],
  "edgeCount": 2,
  "useCases": [
    "External AI services",
    "Model chaining",
    "Protocol integration"
  ],
  "successCriteria": {
    "integrationSuccess": "> 0.90",
    "dataFlow": "seamless",
    "compatibility": "high"
  },
  "costProfile": {
    "llmTokens": 2000,
    "computeCost": "medium",
    "storageCost": "low"
  }
}
```

### AI-012: Continuous Learning Loop
```json
{
  "id": "AI-012",
  "name": "Continuous Learning Loop",
  "category": "ai-composition",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.77,
  "description": "Feedback loop for continuous AI improvement",
  "nodeSequence": ["llm", "data-sink", "data-source", "llm"],
  "edgeCount": 3,
  "useCases": [
    "Model fine-tuning",
    "Adaptive systems",
    "Self-improvement"
  ],
  "successCriteria": {
    "improvementRate": "> 0.10 per cycle",
    "convergence": "stable",
    "performance": "increasing"
  },
  "costProfile": {
    "llmTokens": 5000,
    "computeCost": "high",
    "storageCost": "high"
  }
}
```

---

## 3. Data Transformation Patterns

### DT-001: Nested Object Flattening
```json
{
  "id": "DT-001",
  "name": "Nested Object Flattening",
  "category": "data-transformation",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.95,
  "description": "Flatten nested MongoDB documents for tabular display",
  "nodeSequence": ["transform", "data-grid"],
  "edgeCount": 1,
  "useCases": [
    "MongoDB to spreadsheet",
    "Complex data visualization",
    "Data export"
  ],
  "successCriteria": {
    "flatteningAccuracy": "100%",
    "dataLoss": "none",
    "performance": "fast"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "low",
    "storageCost": "minimal"
  }
}
```

### DT-002: Smart Aggregation
```json
{
  "id": "DT-002",
  "name": "Smart Aggregation",
  "category": "data-transformation",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.93,
  "description": "Intelligent aggregation with automatic strategy selection",
  "nodeSequence": ["aggregation"],
  "edgeCount": 0,
  "useCases": [
    "Time-series summarization",
    "Analytics reports",
    "Dashboard metrics"
  ],
  "successCriteria": {
    "strategyOptimality": "> 0.85",
    "performance": "< 5s",
    "accuracy": "> 0.99"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "low",
    "storageCost": "minimal"
  }
}
```

### DT-003: Field Mapping
```json
{
  "id": "DT-003",
  "name": "Field Mapping",
  "category": "data-transformation",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.96,
  "description": "Map input fields to output schema",
  "nodeSequence": ["mapper"],
  "edgeCount": 0,
  "useCases": [
    "Schema transformation",
    "API integration",
    "Data normalization"
  ],
  "successCriteria": {
    "mappingAccuracy": "100%",
    "typeConversion": "safe",
    "nullHandling": "robust"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "minimal",
    "storageCost": "minimal"
  }
}
```

### DT-004: Type Coercion
```json
{
  "id": "DT-004",
  "name": "Type Coercion",
  "category": "data-transformation",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": false,
  "confidence": 0.91,
  "description": "Safe type conversion with validation",
  "nodeSequence": ["transform"],
  "edgeCount": 0,
  "useCases": [
    "Data cleaning",
    "Type safety",
    "Format standardization"
  ],
  "successCriteria": {
    "conversionSuccess": "> 0.95",
    "errorHandling": "graceful",
    "dataIntegrity": "maintained"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "minimal",
    "storageCost": "minimal"
  }
}
```

### DT-005: Calculated Fields
```json
{
  "id": "DT-005",
  "name": "Calculated Fields",
  "category": "data-transformation",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": false,
  "confidence": 0.92,
  "description": "Add computed fields based on existing data",
  "nodeSequence": ["code"],
  "edgeCount": 0,
  "useCases": [
    "Business metrics",
    "Derived values",
    "Formula calculations"
  ],
  "successCriteria": {
    "calculationAccuracy": "100%",
    "performance": "fast",
    "reusability": "high"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "low",
    "storageCost": "minimal"
  }
}
```

### DT-006: Data Deduplication
```json
{
  "id": "DT-006",
  "name": "Data Deduplication",
  "category": "data-transformation",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": false,
  "confidence": 0.89,
  "description": "Remove duplicate records based on key fields",
  "nodeSequence": ["aggregation", "code"],
  "edgeCount": 1,
  "useCases": [
    "Data cleaning",
    "Unique records",
    "Quality assurance"
  ],
  "successCriteria": {
    "duplicateDetection": "> 0.95",
    "dataPreservation": "complete",
    "performance": "optimized"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "medium",
    "storageCost": "low"
  }
}
```

### DT-007: Timestamp Normalization
```json
{
  "id": "DT-007",
  "name": "Timestamp Normalization",
  "category": "data-transformation",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": false,
  "confidence": 0.94,
  "description": "Convert timestamps to consistent format and timezone",
  "nodeSequence": ["transform"],
  "edgeCount": 0,
  "useCases": [
    "Time-series data",
    "Global applications",
    "Data synchronization"
  ],
  "successCriteria": {
    "conversionAccuracy": "100%",
    "timezoneHandling": "correct",
    "formatConsistency": "complete"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "minimal",
    "storageCost": "minimal"
  }
}
```

### DT-008: Array Expansion
```json
{
  "id": "DT-008",
  "name": "Array Expansion",
  "category": "data-transformation",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": false,
  "confidence": 0.88,
  "description": "Expand array fields into separate records",
  "nodeSequence": ["code"],
  "edgeCount": 0,
  "useCases": [
    "One-to-many relationships",
    "Array flattening",
    "Detail expansion"
  ],
  "successCriteria": {
    "expansionCompleteness": "100%",
    "parentContext": "preserved",
    "performance": "acceptable"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "low",
    "storageCost": "medium"
  }
}
```

### DT-009: Null Handling
```json
{
  "id": "DT-009",
  "name": "Null Handling",
  "category": "data-transformation",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": false,
  "confidence": 0.90,
  "description": "Handle null/missing values with strategies",
  "nodeSequence": ["transform"],
  "edgeCount": 0,
  "useCases": [
    "Data cleaning",
    "Default values",
    "Quality improvement"
  ],
  "successCriteria": {
    "nullDetection": "100%",
    "strategyApplied": "consistent",
    "dataIntegrity": "maintained"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "minimal",
    "storageCost": "minimal"
  }
}
```

### DT-010: Schema Validation
```json
{
  "id": "DT-010",
  "name": "Schema Validation",
  "category": "data-transformation",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.92,
  "description": "Validate data against expected schema",
  "nodeSequence": ["rules"],
  "edgeCount": 0,
  "useCases": [
    "Data quality",
    "Contract enforcement",
    "Error prevention"
  ],
  "successCriteria": {
    "validationCoverage": "100%",
    "errorReporting": "detailed",
    "performance": "fast"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "low",
    "storageCost": "minimal"
  }
}
```

---

## 4. Application Workflows

### AW-001: CRM Lead Scoring
```json
{
  "id": "AW-001",
  "name": "CRM Lead Scoring",
  "category": "application-workflow",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.87,
  "description": "Score and qualify leads using AI analysis",
  "nodeSequence": ["data-source", "expert", "mapper", "data-sink"],
  "edgeCount": 3,
  "application": "app.crm",
  "useCases": [
    "Lead qualification",
    "Sales prioritization",
    "Pipeline management"
  ],
  "successCriteria": {
    "scoringAccuracy": "> 0.85",
    "conversionCorrelation": "> 0.70",
    "processingTime": "< 5s"
  },
  "costProfile": {
    "llmTokens": 1500,
    "computeCost": "medium",
    "storageCost": "low"
  }
}
```

### AW-002: Support Ticket Triage
```json
{
  "id": "AW-002",
  "name": "Support Ticket Triage",
  "category": "application-workflow",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.90,
  "description": "Automatically categorize and route support tickets",
  "nodeSequence": ["webhook", "llm", "rules", "data-sink"],
  "edgeCount": 3,
  "application": "app.support",
  "useCases": [
    "Ticket routing",
    "Priority assignment",
    "Automated responses"
  ],
  "successCriteria": {
    "categorizationAccuracy": "> 0.88",
    "routingSuccess": "> 0.92",
    "responseTime": "< 10s"
  },
  "costProfile": {
    "llmTokens": 800,
    "computeCost": "low",
    "storageCost": "low"
  }
}
```

### AW-003: Document Contract Analysis
```json
{
  "id": "AW-003",
  "name": "Document Contract Analysis",
  "category": "application-workflow",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.83,
  "description": "Extract and analyze contract clauses",
  "nodeSequence": ["http", "llm", "mapper", "data-sink"],
  "edgeCount": 3,
  "application": "app.documents",
  "useCases": [
    "Contract review",
    "Clause extraction",
    "Risk assessment"
  ],
  "successCriteria": {
    "extractionCompleteness": "> 0.90",
    "riskIdentification": "> 0.85",
    "reviewTime": "< 2 minutes"
  },
  "costProfile": {
    "llmTokens": 5000,
    "computeCost": "high",
    "storageCost": "medium"
  }
}
```

### AW-004: Sales Forecast
```json
{
  "id": "AW-004",
  "name": "Sales Forecast",
  "category": "application-workflow",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.84,
  "description": "Predict future sales using historical data and AI",
  "nodeSequence": ["data-source", "aggregation", "insight", "chart"],
  "edgeCount": 3,
  "application": "app.forecasting",
  "useCases": [
    "Revenue forecasting",
    "Inventory planning",
    "Capacity planning"
  ],
  "successCriteria": {
    "forecastAccuracy": "> 0.75",
    "predictionHorizon": "3-6 months",
    "updateFrequency": "daily"
  },
  "costProfile": {
    "llmTokens": 3000,
    "computeCost": "high",
    "storageCost": "medium"
  }
}
```

### AW-005: Analytics Dashboard
```json
{
  "id": "AW-005",
  "name": "Analytics Dashboard",
  "category": "application-workflow",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.92,
  "description": "Real-time business intelligence dashboard",
  "nodeSequence": ["data-source", "aggregation", "chart", "insight"],
  "edgeCount": 3,
  "application": "app.analytics",
  "useCases": [
    "Business metrics",
    "KPI monitoring",
    "Executive reporting"
  ],
  "successCriteria": {
    "dataFreshness": "< 5 minutes",
    "visualClarity": "high",
    "insightQuality": "actionable"
  },
  "costProfile": {
    "llmTokens": 2000,
    "computeCost": "medium",
    "storageCost": "low"
  }
}
```

### AW-006: Knowledge Search
```json
{
  "id": "AW-006",
  "name": "Knowledge Search",
  "category": "application-workflow",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.89,
  "description": "Semantic search across internal knowledge base",
  "nodeSequence": ["data-source", "lookup", "llm", "mapper"],
  "edgeCount": 3,
  "application": "app.knowledge",
  "useCases": [
    "Employee knowledge search",
    "Document retrieval",
    "Q&A systems"
  ],
  "successCriteria": {
    "searchRelevance": "> 0.85",
    "retrievalSpeed": "< 2s",
    "answerQuality": "high"
  },
  "costProfile": {
    "llmTokens": 2000,
    "computeCost": "medium",
    "storageCost": "low"
  }
}
```

### AW-007: Process Automation
```json
{
  "id": "AW-007",
  "name": "Process Automation",
  "category": "application-workflow",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.88,
  "description": "Automate business processes with AI decision points",
  "nodeSequence": ["webhook", "rules", "llm", "http", "data-sink"],
  "edgeCount": 4,
  "application": "app.automation",
  "useCases": [
    "Workflow automation",
    "Smart routing",
    "Process orchestration"
  ],
  "successCriteria": {
    "automationRate": "> 0.85",
    "errorRate": "< 0.05",
    "efficiency": "high"
  },
  "costProfile": {
    "llmTokens": 1500,
    "computeCost": "medium",
    "storageCost": "low"
  }
}
```

### AW-008: Personalization Engine
```json
{
  "id": "AW-008",
  "name": "Personalization Engine",
  "category": "application-workflow",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": false,
  "confidence": 0.82,
  "description": "Generate personalized recommendations",
  "nodeSequence": ["data-source", "agent", "mapper", "data-sink"],
  "edgeCount": 3,
  "application": "app.personalization",
  "useCases": [
    "Product recommendations",
    "Content personalization",
    "Customer engagement"
  ],
  "successCriteria": {
    "relevanceScore": "> 0.80",
    "clickThroughRate": "> 0.15",
    "conversionLift": "> 0.10"
  },
  "costProfile": {
    "llmTokens": 2500,
    "computeCost": "high",
    "storageCost": "medium"
  }
}
```

### AW-009: Risk Detection
```json
{
  "id": "AW-009",
  "name": "Risk Detection",
  "category": "application-workflow",
  "priority": "CRITICAL",
  "foundation": true,
  "sticky": true,
  "confidence": 0.91,
  "description": "Detect fraud and compliance violations",
  "nodeSequence": ["data-source", "expert", "rules", "data-sink"],
  "edgeCount": 3,
  "application": "app.risk",
  "useCases": [
    "Fraud detection",
    "Compliance monitoring",
    "Anomaly detection"
  ],
  "successCriteria": {
    "detectionRate": "> 0.90",
    "falsePositiveRate": "< 0.10",
    "responseTime": "real-time"
  },
  "costProfile": {
    "llmTokens": 2000,
    "computeCost": "high",
    "storageCost": "high"
  }
}
```

### AW-010: MLOps Model Monitoring
```json
{
  "id": "AW-010",
  "name": "MLOps Model Monitoring",
  "category": "application-workflow",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.86,
  "description": "Monitor ML model performance and drift",
  "nodeSequence": ["data-source", "aggregation", "insight", "data-sink"],
  "edgeCount": 3,
  "application": "app.mlops",
  "useCases": [
    "Model drift detection",
    "Performance monitoring",
    "Automated alerting"
  ],
  "successCriteria": {
    "driftDetection": "> 0.85",
    "alertAccuracy": "> 0.90",
    "monitoringLatency": "< 1 hour"
  },
  "costProfile": {
    "llmTokens": 1500,
    "computeCost": "medium",
    "storageCost": "high"
  }
}
```

### AW-011: Chat Assistant
```json
{
  "id": "AW-011",
  "name": "Chat Assistant",
  "category": "application-workflow",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.93,
  "description": "Conversational AI with memory and context",
  "nodeSequence": ["memory", "agent", "memory"],
  "edgeCount": 2,
  "application": "app.chat",
  "useCases": [
    "Customer support chat",
    "Sales assistant",
    "General inquiries"
  ],
  "successCriteria": {
    "responseQuality": "high",
    "contextRetention": "> 0.90",
    "userSatisfaction": "> 0.85"
  },
  "costProfile": {
    "llmTokens": 3000,
    "computeCost": "medium",
    "storageCost": "low"
  }
}
```

### AW-012: CMS Content Publishing
```json
{
  "id": "AW-012",
  "name": "CMS Content Publishing",
  "category": "application-workflow",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": false,
  "confidence": 0.85,
  "description": "AI-assisted content creation and publishing",
  "nodeSequence": ["data-source", "llm", "mapper", "data-sink"],
  "edgeCount": 3,
  "application": "app.change_management",
  "useCases": [
    "Content generation",
    "SEO optimization",
    "Publishing automation"
  ],
  "successCriteria": {
    "contentQuality": "high",
    "seoScore": "> 0.80",
    "publishingSuccess": "> 0.95"
  },
  "costProfile": {
    "llmTokens": 4000,
    "computeCost": "high",
    "storageCost": "medium"
  }
}
```

### AW-013: Data Pipeline Management
```json
{
  "id": "AW-013",
  "name": "Data Pipeline Management",
  "category": "application-workflow",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.90,
  "description": "Visual data pipeline creation and monitoring",
  "nodeSequence": ["data-source", "transform", "data-sink"],
  "edgeCount": 2,
  "application": "app.data_management",
  "useCases": [
    "ETL workflows",
    "Data integration",
    "Pipeline orchestration"
  ],
  "successCriteria": {
    "pipelineReliability": "> 0.99",
    "dataIntegrity": "100%",
    "performance": "optimized"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "low",
    "storageCost": "high"
  }
}
```

### AW-014: Admin System Monitoring
```json
{
  "id": "AW-014",
  "name": "Admin System Monitoring",
  "category": "application-workflow",
  "priority": "CRITICAL",
  "foundation": true,
  "sticky": true,
  "confidence": 0.94,
  "description": "Monitor system health and user activity",
  "nodeSequence": ["data-source", "aggregation", "insight", "data-sink"],
  "edgeCount": 3,
  "application": "app.administration",
  "useCases": [
    "System health monitoring",
    "User activity tracking",
    "Performance analytics"
  ],
  "successCriteria": {
    "monitoringCoverage": "100%",
    "alertingAccuracy": "> 0.95",
    "responseTime": "real-time"
  },
  "costProfile": {
    "llmTokens": 1000,
    "computeCost": "medium",
    "storageCost": "high"
  }
}
```

---

## 5. Error Recovery Patterns

### ER-001: Credential Failure Recovery
```json
{
  "id": "ER-001",
  "name": "Credential Failure Recovery",
  "category": "error-recovery",
  "priority": "CRITICAL",
  "foundation": true,
  "sticky": true,
  "confidence": 0.96,
  "description": "Detect and guide recovery from credential issues",
  "triggerConditions": [
    "auth-error",
    "connection-refused",
    "invalid-credentials"
  ],
  "recoverySteps": [
    "Verify credential exists",
    "Check credential decryption",
    "Validate database name",
    "Test connection",
    "Suggest re-entry"
  ],
  "successCriteria": {
    "detectionAccuracy": "100%",
    "recoveryGuidance": "clear",
    "resolutionTime": "< 5 minutes"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "minimal",
    "storageCost": "minimal"
  }
}
```

### ER-002: Database Connection Retry
```json
{
  "id": "ER-002",
  "name": "Database Connection Retry",
  "category": "error-recovery",
  "priority": "CRITICAL",
  "foundation": true,
  "sticky": true,
  "confidence": 0.94,
  "description": "Retry logic for transient database failures",
  "triggerConditions": [
    "connection-timeout",
    "network-error",
    "temporary-unavailable"
  ],
  "recoverySteps": [
    "Exponential backoff",
    "Max 3 retries",
    "Health check",
    "Fallback to cache"
  ],
  "successCriteria": {
    "recoveryRate": "> 0.85",
    "userImpact": "minimal",
    "transparentRetry": true
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "low",
    "storageCost": "minimal"
  }
}
```

### ER-003: LLM Rate Limit Handling
```json
{
  "id": "ER-003",
  "name": "LLM Rate Limit Handling",
  "category": "error-recovery",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.92,
  "description": "Handle LLM API rate limiting gracefully",
  "triggerConditions": [
    "rate-limit-exceeded",
    "quota-exceeded",
    "429-error"
  ],
  "recoverySteps": [
    "Queue request",
    "Respect retry-after header",
    "Use exponential backoff",
    "Notify user of delay"
  ],
  "successCriteria": {
    "requestPreservation": "100%",
    "userNotification": "timely",
    "recoverySuccess": "> 0.95"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "minimal",
    "storageCost": "low"
  }
}
```

### ER-004: Data Validation Errors
```json
{
  "id": "ER-004",
  "name": "Data Validation Errors",
  "category": "error-recovery",
  "priority": "HIGH",
  "foundation": true,
  "sticky": false,
  "confidence": 0.90,
  "description": "Handle and report data validation failures",
  "triggerConditions": [
    "schema-mismatch",
    "type-error",
    "constraint-violation"
  ],
  "recoverySteps": [
    "Identify failing records",
    "Log detailed errors",
    "Attempt type coercion",
    "Skip or quarantine bad data"
  ],
  "successCriteria": {
    "errorReporting": "detailed",
    "dataPreservation": "safe",
    "processingContinuation": "uninterrupted"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "low",
    "storageCost": "low"
  }
}
```

### ER-005: Pipeline Execution Failure
```json
{
  "id": "ER-005",
  "name": "Pipeline Execution Failure",
  "category": "error-recovery",
  "priority": "CRITICAL",
  "foundation": true,
  "sticky": true,
  "confidence": 0.88,
  "description": "Recover from node execution failures in pipelines",
  "triggerConditions": [
    "node-execution-error",
    "timeout",
    "resource-unavailable"
  ],
  "recoverySteps": [
    "Log failure details",
    "Rollback partial changes",
    "Retry with backoff",
    "Notify administrators"
  ],
  "successCriteria": {
    "stateConsistency": "maintained",
    "errorVisibility": "high",
    "recoveryAttempts": "intelligent"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "medium",
    "storageCost": "medium"
  }
}
```

### ER-006: Configuration Fallback
```json
{
  "id": "ER-006",
  "name": "Configuration Fallback",
  "category": "error-recovery",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.95,
  "description": "Fallback to default configuration when user config is missing",
  "triggerConditions": [
    "config-not-found",
    "config-corrupted",
    "config-invalid"
  ],
  "recoverySteps": [
    "Try user-specific config",
    "Fallback to 'default' config",
    "Use system defaults",
    "Log fallback event"
  ],
  "successCriteria": {
    "serviceContinuity": "maintained",
    "degradationGraceful": true,
    "userNotified": true
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "minimal",
    "storageCost": "minimal"
  }
}
```

### ER-007: Memory Overflow Handling
```json
{
  "id": "ER-007",
  "name": "Memory Overflow Handling",
  "category": "error-recovery",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": false,
  "confidence": 0.87,
  "description": "Manage conversation memory when capacity is exceeded",
  "triggerConditions": [
    "memory-full",
    "capacity-exceeded",
    "context-overflow"
  ],
  "recoverySteps": [
    "Summarize old messages",
    "Prune least relevant",
    "Maintain recent context",
    "Notify of compression"
  ],
  "successCriteria": {
    "contextRetention": "> 0.80",
    "compressionLoss": "minimal",
    "coherenceMaintained": true
  },
  "costProfile": {
    "llmTokens": 1000,
    "computeCost": "medium",
    "storageCost": "low"
  }
}
```

### ER-008: Partial Data Recovery
```json
{
  "id": "ER-008",
  "name": "Partial Data Recovery",
  "category": "error-recovery",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": false,
  "confidence": 0.84,
  "description": "Recover and process partial data when full dataset unavailable",
  "triggerConditions": [
    "incomplete-data",
    "partial-failure",
    "data-truncation"
  ],
  "recoverySteps": [
    "Assess data completeness",
    "Process available data",
    "Mark results as partial",
    "Log missing data"
  ],
  "successCriteria": {
    "usefulnessThreshold": "> 0.70",
    "transparency": "complete",
    "userWarned": true
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "low",
    "storageCost": "low"
  }
}
```

---

## 6. LLM Prompt Templates

### PT-001: Structured Data Analysis
```json
{
  "id": "PT-001",
  "name": "Structured Data Analysis",
  "category": "prompt-template",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.92,
  "template": "Analyze this structured data and provide insights:\n\n{{data}}\n\nFocus on:\n1. Key trends and patterns\n2. Anomalies or outliers\n3. Actionable recommendations\n\nFormat response as JSON:\n{\n  \"insights\": [{\"type\": \"...\", \"description\": \"...\", \"confidence\": 0-1}],\n  \"recommendations\": [{\"action\": \"...\", \"priority\": \"...\", \"impact\": \"...\"}],\n  \"overallConfidence\": 0-1\n}",
  "useCases": [
    "Data insights",
    "Business analytics",
    "Trend analysis"
  ],
  "successCriteria": {
    "responseStructure": "valid JSON",
    "insightRelevance": "> 0.85",
    "actionability": "high"
  },
  "costProfile": {
    "llmTokens": 500,
    "computeCost": "low",
    "storageCost": "minimal"
  }
}
```

### PT-002: Document Summarization
```json
{
  "id": "PT-002",
  "name": "Document Summarization",
  "category": "prompt-template",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.94,
  "template": "Summarize the following document concisely:\n\n{{document}}\n\nProvide:\n1. Executive summary (2-3 sentences)\n2. Key points (bulleted list)\n3. Important dates/deadlines\n4. Required actions\n\nKeep summary under 200 words.",
  "useCases": [
    "Document review",
    "Contract analysis",
    "Report generation"
  ],
  "successCriteria": {
    "summaryLength": "< 200 words",
    "informationRetention": "> 0.90",
    "readability": "high"
  },
  "costProfile": {
    "llmTokens": 1000,
    "computeCost": "medium",
    "storageCost": "minimal"
  }
}
```

### PT-003: Sentiment Analysis
```json
{
  "id": "PT-003",
  "name": "Sentiment Analysis",
  "category": "prompt-template",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": true,
  "confidence": 0.91,
  "template": "Analyze the sentiment of this message:\n\n{{message}}\n\nProvide:\n{\n  \"sentiment\": \"positive|neutral|negative\",\n  \"score\": -1 to 1,\n  \"emotions\": [\"...\"],\n  \"urgency\": \"low|medium|high\",\n  \"requiresEscalation\": true|false,\n  \"reasoning\": \"...\"\n}",
  "useCases": [
    "Customer support",
    "Email triage",
    "Feedback analysis"
  ],
  "successCriteria": {
    "sentimentAccuracy": "> 0.85",
    "escalationPrecision": "> 0.90",
    "responseFormat": "valid JSON"
  },
  "costProfile": {
    "llmTokens": 300,
    "computeCost": "low",
    "storageCost": "minimal"
  }
}
```

### PT-004: Classification
```json
{
  "id": "PT-004",
  "name": "Classification",
  "category": "prompt-template",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": false,
  "confidence": 0.88,
  "template": "Classify this item into one of these categories:\n\nCategories: {{categories}}\n\nItem: {{item}}\n\nProvide:\n{\n  \"category\": \"...\",\n  \"confidence\": 0-1,\n  \"reasoning\": \"...\",\n  \"alternativeCategories\": [{\"category\": \"...\", \"confidence\": 0-1}]\n}",
  "useCases": [
    "Content categorization",
    "Ticket routing",
    "Data organization"
  ],
  "successCriteria": {
    "classificationAccuracy": "> 0.85",
    "confidenceCalibration": "well-calibrated",
    "responseFormat": "valid JSON"
  },
  "costProfile": {
    "llmTokens": 400,
    "computeCost": "low",
    "storageCost": "minimal"
  }
}
```

### PT-005: Question Answering
```json
{
  "id": "PT-005",
  "name": "Question Answering",
  "category": "prompt-template",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.90,
  "template": "Answer this question based on the provided context:\n\nContext:\n{{context}}\n\nQuestion: {{question}}\n\nProvide a clear, concise answer. If the context doesn't contain enough information, say so explicitly. Include confidence level (0-1) and cite specific parts of the context used.",
  "useCases": [
    "Knowledge base Q&A",
    "Document search",
    "Support automation"
  ],
  "successCriteria": {
    "answerAccuracy": "> 0.88",
    "sourceAttribution": "accurate",
    "confidenceHonesty": "calibrated"
  },
  "costProfile": {
    "llmTokens": 800,
    "computeCost": "medium",
    "storageCost": "minimal"
  }
}
```

### PT-006: Data Extraction
```json
{
  "id": "PT-006",
  "name": "Data Extraction",
  "category": "prompt-template",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": false,
  "confidence": 0.86,
  "template": "Extract the following information from this text:\n\nText: {{text}}\n\nExtract:\n{{fields}}\n\nReturn as JSON:\n{\n  \"field1\": \"...\",\n  \"field2\": \"...\",\n  \"extractionConfidence\": 0-1,\n  \"missingFields\": [...]\n}",
  "useCases": [
    "Form processing",
    "Data parsing",
    "Information extraction"
  ],
  "successCriteria": {
    "extractionCompleteness": "> 0.85",
    "accuracy": "> 0.90",
    "formatCompliance": "100%"
  },
  "costProfile": {
    "llmTokens": 600,
    "computeCost": "medium",
    "storageCost": "minimal"
  }
}
```

### PT-007: Content Generation
```json
{
  "id": "PT-007",
  "name": "Content Generation",
  "category": "prompt-template",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": false,
  "confidence": 0.83,
  "template": "Generate {{contentType}} content based on these parameters:\n\nTopic: {{topic}}\nTone: {{tone}}\nLength: {{length}}\nAudience: {{audience}}\nKey points: {{keyPoints}}\n\nEnsure the content is:\n- Engaging and well-structured\n- Appropriate for the target audience\n- Incorporates all key points naturally\n- Matches the specified tone",
  "useCases": [
    "Marketing content",
    "Email generation",
    "Report writing"
  ],
  "successCriteria": {
    "relevance": "> 0.85",
    "toneMatch": "> 0.90",
    "readability": "high"
  },
  "costProfile": {
    "llmTokens": 2000,
    "computeCost": "high",
    "storageCost": "minimal"
  }
}
```

### PT-008: Translation
```json
{
  "id": "PT-008",
  "name": "Translation",
  "category": "prompt-template",
  "priority": "LOW",
  "foundation": true,
  "sticky": false,
  "confidence": 0.89,
  "template": "Translate this text from {{sourceLanguage}} to {{targetLanguage}}:\n\n{{text}}\n\nMaintain:\n- Original meaning and tone\n- Technical terminology accuracy\n- Cultural appropriateness\n\nProvide:\n{\n  \"translation\": \"...\",\n  \"confidence\": 0-1,\n  \"notes\": \"any important translation notes\"\n}",
  "useCases": [
    "Multilingual support",
    "Content localization",
    "Communication"
  ],
  "successCriteria": {
    "translationAccuracy": "> 0.90",
    "meaningPreservation": "> 0.95",
    "naturalness": "high"
  },
  "costProfile": {
    "llmTokens": 1000,
    "computeCost": "medium",
    "storageCost": "minimal"
  }
}
```

### PT-009: Reasoning and Explanation
```json
{
  "id": "PT-009",
  "name": "Reasoning and Explanation",
  "category": "prompt-template",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.87,
  "template": "Analyze this problem and explain your reasoning:\n\nProblem: {{problem}}\nContext: {{context}}\n\nProvide:\n1. Step-by-step analysis\n2. Key considerations\n3. Recommended solution\n4. Confidence level\n5. Alternative approaches\n\nBe explicit about assumptions and uncertainties.",
  "useCases": [
    "Decision support",
    "Problem solving",
    "Expert consultation"
  ],
  "successCriteria": {
    "reasoningClarity": "high",
    "solutionQuality": "> 0.85",
    "explainability": "excellent"
  },
  "costProfile": {
    "llmTokens": 3000,
    "computeCost": "high",
    "storageCost": "minimal"
  }
}
```

### PT-010: Code Review
```json
{
  "id": "PT-010",
  "name": "Code Review",
  "category": "prompt-template",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": false,
  "confidence": 0.81,
  "template": "Review this code for quality and potential issues:\\n\\nCode to review: {{code}}\\n\\nCheck for:\\n1. Logic errors and bugs\\n2. Performance issues\\n3. Security vulnerabilities\\n4. Code style and best practices\\n5. Potential improvements\\n\\nProvide structured JSON response with issues array, suggestions array, and overallQuality score (0-10).",
  "useCases": [
    "Code review automation",
    "Quality assurance",
    "Developer assistance"
  ],
  "successCriteria": {
    "issueDetection": "> 0.80",
    "falsePositives": "< 0.20",
    "helpfulness": "high"
  },
  "costProfile": {
    "llmTokens": 2500,
    "computeCost": "high",
    "storageCost": "minimal"
  }
}
```

---

## 7. System Configuration Patterns

### SC-001: CORTEX Three-DB Setup
```json
{
  "id": "SC-001",
  "name": "CORTEX Three-DB Setup",
  "category": "system-config",
  "priority": "CRITICAL",
  "foundation": true,
  "sticky": true,
  "confidence": 1.0,
  "description": "Standard CORTEX configuration with Vector, Graph, and Document databases",
  "configuration": {
    "vectorDb": {
      "type": "qdrant",
      "defaultPort": 6333,
      "collection": "regno_embeddings",
      "dimensions": 3072,
      "distance": "cosine"
    },
    "graphDb": {
      "type": "neo4j",
      "defaultPort": 7687,
      "database": "neo4j",
      "protocol": "bolt"
    },
    "documentDb": {
      "type": "mongodb",
      "collection": "cortex_patterns",
      "database": "regno"
    },
    "embedding": {
      "provider": "openai",
      "model": "text-embedding-3-large",
      "dimensions": 3072
    }
  },
  "useCases": [
    "CORTEX initialization",
    "Learning system setup",
    "Multi-database architecture"
  ],
  "successCriteria": {
    "allComponentsOnline": true,
    "healthCheckPassing": true,
    "performanceOptimal": true
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "low",
    "storageCost": "high"
  }
}
```

### SC-002: Standard MongoDB Connection
```json
{
  "id": "SC-002",
  "name": "Standard MongoDB Connection",
  "category": "system-config",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.98,
  "description": "Best practices for MongoDB connection configuration",
  "configuration": {
    "replicaSet": "required",
    "readPreference": "primaryPreferred",
    "writeConcern": "majority",
    "maxPoolSize": 100,
    "minPoolSize": 10,
    "serverSelectionTimeout": 30000,
    "socketTimeout": 45000,
    "retryWrites": true,
    "retryReads": true
  },
  "useCases": [
    "Database connections",
    "Data source nodes",
    "Data sink nodes"
  ],
  "successCriteria": {
    "reliability": "> 0.999",
    "performance": "optimized",
    "failoverHandling": "automatic"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "minimal",
    "storageCost": "minimal"
  }
}
```

### SC-003: LLM Provider Defaults
```json
{
  "id": "SC-003",
  "name": "LLM Provider Defaults",
  "category": "system-config",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.95,
  "description": "Recommended defaults for LLM providers",
  "configuration": {
    "openai": {
      "defaultModel": "gpt-4o",
      "fallbackModel": "gpt-4o-mini",
      "temperature": 0.2,
      "maxTokens": 4096,
      "topP": 1.0,
      "timeout": 60000
    },
    "anthropic": {
      "defaultModel": "claude-3-5-sonnet-20241022",
      "temperature": 0.2,
      "maxTokens": 4096,
      "timeout": 60000
    }
  },
  "useCases": [
    "LLM node configuration",
    "Agent setup",
    "Expert consultation"
  ],
  "successCriteria": {
    "responseQuality": "high",
    "costEfficiency": "balanced",
    "reliability": "> 0.95"
  },
  "costProfile": {
    "llmTokens": "variable",
    "computeCost": "medium",
    "storageCost": "minimal"
  }
}
```

### SC-004: Credential Encryption Standard
```json
{
  "id": "SC-004",
  "name": "Credential Encryption Standard",
  "category": "system-config",
  "priority": "CRITICAL",
  "foundation": true,
  "sticky": true,
  "confidence": 1.0,
  "description": "Standard encryption configuration for credentials",
  "configuration": {
    "algorithm": "aes-256-cbc",
    "keyDerivation": "pbkdf2",
    "iterations": 100000,
    "saltLength": 16,
    "ivLength": 16,
    "encoding": "hex"
  },
  "useCases": [
    "Credential storage",
    "Security compliance",
    "Data protection"
  ],
  "successCriteria": {
    "security": "military-grade",
    "compliance": "industry-standard",
    "performance": "acceptable"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "minimal",
    "storageCost": "minimal"
  }
}
```

### SC-005: Pipeline Execution Defaults
```json
{
  "id": "SC-005",
  "name": "Pipeline Execution Defaults",
  "category": "system-config",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.96,
  "description": "Default settings for pipeline execution",
  "configuration": {
    "timeout": 300000,
    "maxConcurrentNodes": 10,
    "bufferSize": 1000,
    "batchSize": 500,
    "retryAttempts": 3,
    "retryDelay": 1000,
    "enableHistory": true,
    "historyRetention": 30
  },
  "useCases": [
    "Pipeline optimization",
    "Performance tuning",
    "Reliability"
  ],
  "successCriteria": {
    "executionReliability": "> 0.99",
    "performance": "optimized",
    "resourceUsage": "efficient"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "low",
    "storageCost": "medium"
  }
}
```

---

## 8. Performance Optimization Patterns

### PO-001: Batch Processing
```json
{
  "id": "PO-001",
  "name": "Batch Processing",
  "category": "performance-optimization",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": false,
  "confidence": 0.91,
  "description": "Optimize throughput using batching",
  "optimization": {
    "technique": "batching",
    "batchSize": 500,
    "parallelism": 10,
    "expectedSpeedup": "3-5x"
  },
  "useCases": [
    "Large dataset processing",
    "ETL workflows",
    "Bulk operations"
  ],
  "successCriteria": {
    "throughputIncrease": "> 3x",
    "latency": "acceptable",
    "memoryUsage": "controlled"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "medium",
    "storageCost": "medium"
  }
}
```

### PO-002: Caching Strategy
```json
{
  "id": "PO-002",
  "name": "Caching Strategy",
  "category": "performance-optimization",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": false,
  "confidence": 0.88,
  "description": "Cache expensive operations for reuse",
  "optimization": {
    "technique": "caching",
    "cacheLocation": "memory",
    "ttl": 3600,
    "maxSize": 10000,
    "evictionPolicy": "LRU"
  },
  "useCases": [
    "Lookup operations",
    "API responses",
    "Computation results"
  ],
  "successCriteria": {
    "hitRate": "> 0.70",
    "latencyReduction": "> 10x",
    "memoryOverhead": "< 500MB"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "low",
    "storageCost": "medium"
  }
}
```

### PO-003: Streaming vs Batch
```json
{
  "id": "PO-003",
  "name": "Streaming vs Batch",
  "category": "performance-optimization",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": false,
  "confidence": 0.85,
  "description": "Choose optimal processing mode based on data characteristics",
  "optimization": {
    "streamingThreshold": 1000,
    "batchThreshold": 10000,
    "realTimeRequirement": "< 1s"
  },
  "useCases": [
    "Variable data volumes",
    "Adaptive processing",
    "Latency optimization"
  ],
  "successCriteria": {
    "latency": "optimized",
    "throughput": "maximized",
    "resourceEfficiency": "high"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "variable",
    "storageCost": "variable"
  }
}
```

### PO-004: Parallel Execution
```json
{
  "id": "PO-004",
  "name": "Parallel Execution",
  "category": "performance-optimization",
  "priority": "HIGH",
  "foundation": true,
  "sticky": false,
  "confidence": 0.89,
  "description": "Execute independent operations in parallel",
  "optimization": {
    "technique": "parallelization",
    "maxParallel": 10,
    "workStealing": true,
    "expectedSpeedup": "5-8x"
  },
  "useCases": [
    "Independent data processing",
    "Multi-source aggregation",
    "Concurrent API calls"
  ],
  "successCriteria": {
    "speedup": "> 5x",
    "resourceUtilization": "> 0.80",
    "errorRate": "< 0.01"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "high",
    "storageCost": "low"
  }
}
```

### PO-005: Data Pagination
```json
{
  "id": "PO-005",
  "name": "Data Pagination",
  "category": "performance-optimization",
  "priority": "MEDIUM",
  "foundation": true,
  "sticky": false,
  "confidence": 0.92,
  "description": "Process large datasets in pages",
  "optimization": {
    "technique": "pagination",
    "pageSize": 1000,
    "cursorBased": true,
    "prefetch": true
  },
  "useCases": [
    "Large result sets",
    "Memory constraints",
    "Progressive loading"
  ],
  "successCriteria": {
    "memoryUsage": "constant",
    "firstPageLatency": "< 2s",
    "throughput": "maintained"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "low",
    "storageCost": "low"
  }
}
```

### PO-006: Index Optimization
```json
{
  "id": "PO-006",
  "name": "Index Optimization",
  "category": "performance-optimization",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.94,
  "description": "Optimize database queries with proper indexing",
  "optimization": {
    "technique": "indexing",
    "indexTypes": ["btree", "text", "compound"],
    "coveringIndexes": true
  },
  "useCases": [
    "Query performance",
    "Data retrieval",
    "Aggregation optimization"
  ],
  "successCriteria": {
    "querySpeedup": "> 10x",
    "indexOverhead": "< 20%",
    "writePerformance": "acceptable"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "minimal",
    "storageCost": "medium"
  }
}
```

### PO-007: Compression
```json
{
  "id": "PO-007",
  "name": "Compression",
  "category": "performance-optimization",
  "priority": "LOW",
  "foundation": true,
  "sticky": false,
  "confidence": 0.87,
  "description": "Compress data for storage and transfer efficiency",
  "optimization": {
    "technique": "compression",
    "algorithm": "gzip",
    "compressionLevel": 6,
    "threshold": 1024
  },
  "useCases": [
    "Large data storage",
    "Network transfer",
    "Archive data"
  ],
  "successCriteria": {
    "compressionRatio": "> 3:1",
    "decompression": "fast",
    "storageReduction": "> 60%"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "medium",
    "storageCost": "low"
  }
}
```

### PO-008: Connection Pooling
```json
{
  "id": "PO-008",
  "name": "Connection Pooling",
  "category": "performance-optimization",
  "priority": "HIGH",
  "foundation": true,
  "sticky": true,
  "confidence": 0.96,
  "description": "Reuse database connections for performance",
  "optimization": {
    "technique": "connection-pooling",
    "minPoolSize": 10,
    "maxPoolSize": 100,
    "idleTimeout": 300000,
    "connectionTimeout": 30000
  },
  "useCases": [
    "Database operations",
    "High-throughput systems",
    "Concurrent access"
  ],
  "successCriteria": {
    "connectionOverhead": "minimal",
    "throughputIncrease": "> 5x",
    "resourceUtilization": "optimized"
  },
  "costProfile": {
    "llmTokens": 0,
    "computeCost": "minimal",
    "storageCost": "minimal"
  }
}
```

---

## Summary Statistics

**Total Patterns:** 82

**By Category:**
- Pipeline Architectures: 15 (18%)
- AI Composition: 12 (15%)
- Data Transformation: 10 (12%)
- Application Workflows: 14 (17%)
- Error Recovery: 8 (10%)
- LLM Prompt Templates: 10 (12%)
- System Configuration: 5 (6%)
- Performance Optimization: 8 (10%)

**By Priority:**
- CRITICAL: 8 (10%)
- HIGH: 47 (57%)
- MEDIUM: 25 (30%)
- LOW: 2 (3%)

**Foundation Patterns:** 82 (100%)
**Sticky Patterns:** 45 (55%)

**Average Confidence:** 0.89

---

## Usage Guidelines

1. **Foundation Patterns** - Cannot be deleted without removing foundation flag
2. **Sticky Patterns** - Pinned in UI, frequently used
3. **Priority Levels** - Guide implementation order
4. **Confidence Scores** - Pattern reliability and success rate

## Next Steps

1. Review and approve pattern catalog
2. Extract additional patterns from existing pipelines
3. Implement pattern provisioning system
4. Build pattern management UI
5. Enable pattern learning and evolution
