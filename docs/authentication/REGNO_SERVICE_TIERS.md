# Regno.ai Service Tier System

## Tier Structure

### 🌱 STARTER (Free)
**Target**: Learning, experimentation, proof of concept

**Capabilities**:
- **LLM Models**: GPT-4o-mini, Claude Haiku
- **Max Tokens**: 2,000 per request
- **Memory (CORTEX)**: Session-only (no persistence)
- **Orchestration (MAESTRO)**: Single-phase only, no dry-run
- **Pipeline Nodes (FLUX)**: Max 5 nodes
- **Concurrent Executions**: 1
- **Vector Operations**: None
- **Graph DB (SENTINEL)**: Read-only
- **Analytics (NEXUS)**: Basic metrics only

### 🔷 STANDARD (Basic Paid - $29/mo)
**Target**: Small projects, individual developers, startups

**Capabilities**:
- **LLM Models**: GPT-4o, Claude Sonnet 3.5
- **Max Tokens**: 4,000 per request
- **Memory (CORTEX)**: Last 50 executions + 1000 vectors
- **Orchestration (MAESTRO)**: Up to 5 phases, dry-run enabled
- **Pipeline Nodes (FLUX)**: Max 15 nodes
- **Concurrent Executions**: 3
- **Vector Operations**: 1000 vectors, basic similarity search
- **Graph DB (SENTINEL)**: Basic relationship tracking
- **Analytics (NEXUS)**: Statistical forecasting

### 💼 PROFESSIONAL (Pro - $99/mo)
**Target**: Production workloads, teams, growing businesses

**Capabilities**:
- **LLM Models**: GPT-4o, Claude Sonnet 4, Gemini Pro
- **Max Tokens**: 8,000 per request
- **Memory (CORTEX)**: Last 500 executions + 10,000 vectors + semantic search
- **Orchestration (MAESTRO)**: Up to 12 phases, refinement enabled
- **Pipeline Nodes (FLUX)**: Max 50 nodes
- **Concurrent Executions**: 10
- **Vector Operations**: 10,000 vectors, hybrid search (dense + sparse)
- **Graph DB (SENTINEL)**: Full relationship tracking + pattern detection
- **Analytics (NEXUS)**: ML-based forecasting + anomaly detection
- **Advanced**: Multi-model routing, A/B testing

### 🏢 ENTERPRISE (Max - $299/mo)
**Target**: Large-scale deployments, mission-critical applications

**Capabilities**:
- **LLM Models**: GPT-4-Turbo, Claude Opus 3.5, Gemini Ultra
- **Max Tokens**: 16,000 per request
- **Memory (CORTEX)**: Unlimited executions + 100,000 vectors + advanced RAG
- **Orchestration (MAESTRO)**: Unlimited phases + parallel execution + meta-orchestration
- **Pipeline Nodes (FLUX)**: Unlimited nodes
- **Concurrent Executions**: 50
- **Vector Operations**: 100,000 vectors, multi-modal embeddings, reranking
- **Graph DB (SENTINEL)**: Advanced graph reasoning + risk scoring
- **Analytics (NEXUS)**: Deep learning models + predictive analytics
- **Advanced**: Multi-agent collaboration, self-healing pipelines, custom integrations

### 🚀 ULTIMATE (Flagship - $999/mo)
**Target**: Research institutions, cutting-edge AI applications, unlimited scale

**Capabilities**:
- **LLM Models**: Latest flagship models (GPT-5, Claude Opus 4, o1-pro, etc.)
- **Max Tokens**: 32,000+ per request (model maximum)
- **Memory (CORTEX)**: Unlimited + episodic memory + knowledge graphs
- **Orchestration (MAESTRO)**: Unlimited + adaptive learning + strategy optimization
- **Pipeline Nodes (FLUX)**: Unlimited + custom node types
- **Concurrent Executions**: Unlimited
- **Vector Operations**: Unlimited vectors, multi-index, custom embeddings
- **Graph DB (SENTINEL)**: Full knowledge graph + reasoning chains
- **Analytics (NEXUS)**: Custom model fine-tuning + transfer learning
- **Advanced**: All features + priority support + custom development + SLA guarantees

## Tier Comparison Matrix

| Feature | STARTER | STANDARD | PROFESSIONAL | ENTERPRISE | ULTIMATE |
|---------|---------|----------|--------------|------------|----------|
| **LLM Models** | Mini/Haiku | GPT-4o/Sonnet 3.5 | Sonnet 4/Gemini Pro | Opus 3.5/4-Turbo | Flagship (o1, Opus 4) |
| **Max Tokens** | 2K | 4K | 8K | 16K | 32K+ |
| **CORTEX Memory** | Session only | 50 exec + 1K vectors | 500 exec + 10K vectors | Unlimited + 100K vectors | Unlimited + Knowledge Graph |
| **MAESTRO Phases** | 1 | 5 | 12 | Unlimited | Unlimited + Adaptive |
| **FLUX Nodes** | 5 | 15 | 50 | Unlimited | Unlimited + Custom |
| **Concurrent Runs** | 1 | 3 | 10 | 50 | Unlimited |
| **SENTINEL** | Read-only | Basic tracking | Pattern detection | Risk scoring | Full reasoning |
| **NEXUS** | Basic metrics | Statistical | ML forecasting | Deep learning | Custom models |
| **Temperature** | 0.7 fixed | 0.0-1.0 | 0.0-2.0 | 0.0-2.0 + custom | Full control |
| **Refinement Loops** | None | 1 | 3 | 10 | Unlimited |
| **Multi-Agent** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Self-Healing** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Custom Models** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **SLA** | None | 99% | 99.5% | 99.9% | 99.99% |
| **Support** | Community | Email | Priority email | Phone + Slack | Dedicated account manager |

## Per-Component Configuration

### LLM Service
```typescript
STARTER: {
  models: ['gpt-4o-mini', 'claude-3-haiku'],
  maxTokens: 2000,
  temperature: 0.7,
  allowedProviders: ['openai', 'anthropic']
}

STANDARD: {
  models: ['gpt-4o', 'claude-3-5-sonnet'],
  maxTokens: 4000,
  temperatureRange: [0.0, 1.0],
  allowedProviders: ['openai', 'anthropic']
}

PROFESSIONAL: {
  models: ['gpt-4o', 'claude-3-5-sonnet', 'claude-sonnet-4', 'gemini-pro'],
  maxTokens: 8000,
  temperatureRange: [0.0, 2.0],
  allowedProviders: ['openai', 'anthropic', 'google']
}

ENTERPRISE: {
  models: ['gpt-4-turbo', 'claude-opus-3.5', 'gemini-ultra'],
  maxTokens: 16000,
  temperatureRange: [0.0, 2.0],
  allowedProviders: ['openai', 'anthropic', 'google', 'custom']
}

ULTIMATE: {
  models: ['o1-pro', 'claude-opus-4', 'gpt-5', '*'],
  maxTokens: 32000,
  temperatureRange: [0.0, 2.0],
  customModels: true,
  allowedProviders: '*'
}
```

### MAESTRO Orchestration
```typescript
STARTER: {
  maxPhases: 1,
  dryRun: false,
  refinement: false,
  parallelExecution: false
}

STANDARD: {
  maxPhases: 5,
  dryRun: true,
  refinement: false,
  parallelExecution: false
}

PROFESSIONAL: {
  maxPhases: 12,
  dryRun: true,
  refinement: true,
  maxRefinementLoops: 3,
  parallelExecution: true
}

ENTERPRISE: {
  maxPhases: Infinity,
  dryRun: true,
  refinement: true,
  maxRefinementLoops: 10,
  parallelExecution: true,
  metaOrchestration: true
}

ULTIMATE: {
  maxPhases: Infinity,
  dryRun: true,
  refinement: true,
  maxRefinementLoops: Infinity,
  parallelExecution: true,
  metaOrchestration: true,
  adaptiveLearning: true
}
```

### CORTEX Memory
```typescript
STARTER: {
  persistence: false,
  maxExecutions: 0,
  maxVectors: 0
}

STANDARD: {
  persistence: true,
  maxExecutions: 50,
  maxVectors: 1000,
  searchType: 'basic'
}

PROFESSIONAL: {
  persistence: true,
  maxExecutions: 500,
  maxVectors: 10000,
  searchType: 'hybrid',
  semanticSearch: true
}

ENTERPRISE: {
  persistence: true,
  maxExecutions: Infinity,
  maxVectors: 100000,
  searchType: 'advanced',
  multiModal: true,
  reranking: true
}

ULTIMATE: {
  persistence: true,
  maxExecutions: Infinity,
  maxVectors: Infinity,
  searchType: 'advanced',
  multiModal: true,
  reranking: true,
  knowledgeGraph: true,
  episodicMemory: true
}
```

### FLUX Pipelines
```typescript
STARTER: {
  maxNodes: 5,
  customNodes: false,
  parallelExecution: false
}

STANDARD: {
  maxNodes: 15,
  customNodes: false,
  parallelExecution: true
}

PROFESSIONAL: {
  maxNodes: 50,
  customNodes: true,
  parallelExecution: true,
  streaming: true
}

ENTERPRISE: {
  maxNodes: Infinity,
  customNodes: true,
  parallelExecution: true,
  streaming: true,
  distributedExecution: true
}

ULTIMATE: {
  maxNodes: Infinity,
  customNodes: true,
  parallelExecution: true,
  streaming: true,
  distributedExecution: true,
  customIntegrations: true
}
```

## Tier Switching

### Storage
- Tier setting stored in `system_config` collection
- Per-user tier override in `users` collection
- Per-execution tier override in execution context

### Override Hierarchy
1. Execution-level override (highest priority)
2. User-level tier
3. System-level tier (default)

### Switching Behavior
- Immediate effect on new executions
- Running executions continue at their started tier
- Component configs update dynamically
- Credentials remain but usage is tier-restricted

## Implementation Notes

### Default Credentials
Auto-create credentials with naming convention:
- `Regno Default - STARTER (GPT-4o-mini)`
- `Regno Default - STANDARD (GPT-4o)`
- `Regno Default - PROFESSIONAL (Sonnet 4)`
- `Regno Default - ENTERPRISE (Opus 3.5)`
- `Regno Default - ULTIMATE (o1-pro)`

### Soft Limits
- Warning at 80% of tier limits
- Graceful degradation when limit hit
- Option to temporarily upgrade for single execution

### Monitoring
- Real-time tier usage dashboard
- Cost estimation per tier
- Recommendations for tier upgrades/downgrades
