# End-to-End Customer Segmentation Example

## Overview
This example demonstrates the full Regno.AI platform capabilities through a real-world customer segmentation scenario. It showcases the integration of all major components: NEXUS, CORTEX, MAESTRO, FLUX, and SENTINEL.

## Scenario
**User Query**: "Analyze our MongoDB customer data and create a segmentation report"

## Components Involved

### 1. NEXUS (Conversational Interface)
- Receives user query via chat interface
- Routes to appropriate system components
- Streams results back to user via SSE

### 2. CORTEX (Cognitive Memory System)
- **Context Retrieval**: Search for relevant memories about MongoDB queries and segmentation approaches
- **Memory Storage**: Store orchestration results as episodic memories
- **Graph Building**: Create relationships between concepts (e.g., segmentation REQUIRES data cleaning)
- **Embeddings**: Generate vector embeddings for future semantic retrieval

### 3. MAESTRO (Multi-Agent Orchestration)
- **Intent Detection**: Determine task complexity
- **Phase Decomposition**: Break down into 6 phases:
  1. Connect to MongoDB and fetch customer data
  2. Clean and preprocess data
  3. Perform segmentation analysis (K-means, RFM)
  4. Generate insights per segment
  5. Create visualization charts
  6. Synthesize final report
- **Execution Coordination**: Orchestrate FLUX pipelines and LLM calls

### 4. FLUX (Pipeline Automation)
- **Data Retrieval**: MongoDB DataSource node
- **Data Transformation**: Mapper nodes for cleaning
- **Analysis**: LLM nodes for segmentation
- **Visualization**: D3 Chart nodes for bar/pie/scatter charts

### 5. SENTINEL (Monitoring & Analytics)
- **Cost Tracking**: Monitor LLM token usage and costs
- **Performance Metrics**: Track latency, throughput
- **Activity Logging**: Record all operations

## Data Flow

```
┌─────────────┐
│ User Query  │
│  (NEXUS)   │
└──────┬──────┘
       │
       v
┌─────────────┐
│   CORTEX    │ ← Retrieve context (past queries, approaches)
│  (Context)  │
└──────┬──────┘
       │
       v
┌─────────────┐
│  MAESTRO    │ ← Plan orchestration (6 phases)
│ (Planning)  │
└──────┬──────┘
       │
       v
┌─────────────┐
│    FLUX     │ ← Phase 1: MongoDB data retrieval
│  (Execute)  │
└──────┬──────┘
       │
       v
┌─────────────┐
│    FLUX     │ ← Phase 2-3: Transform & analyze
│   (LLM)     │
└──────┬──────┘
       │
       v
┌─────────────┐
│    LLM      │ ← Phase 4: Generate insights
│ (Analysis)  │
└──────┬──────┘
       │
       v
┌─────────────┐
│    FLUX     │ ← Phase 5: Create charts
│  (Charts)   │
└──────┬──────┘
       │
       v
┌─────────────┐
│    LLM      │ ← Phase 6: Synthesize report
│  (Report)   │
└──────┬──────┘
       │
       v
┌─────────────┐
│   CORTEX    │ ← Store as memory
│  (Storage)  │
└──────┬──────┘
       │
       v
┌─────────────┐
│  SENTINEL   │ ← Log metrics
│ (Analytics) │
└──────┬──────┘
       │
       v
┌─────────────┐
│   NEXUS    │ → Stream results to user
│  (Response) │
└─────────────┘
```

## Performance Targets

### Latency Goals
- **Context Retrieval (CORTEX)**: < 100ms (P95)
- **Orchestration Planning (MAESTRO)**: < 3s
- **Data Retrieval (MongoDB)**: < 6s for 10,000 records
- **LLM Time to First Token**: < 500ms (P95)
- **Total Duration**: < 60s

### Throughput
- **Concurrent Users**: 10,000+ per instance
- **LLM Requests/sec**: 1,000+ (provider limited)
- **Vector Searches/sec**: 10,000+ (Qdrant HNSW)

### Cost Efficiency
- **Total Cost per Run**: ~$0.42
- **LLM Calls**: 8 total (4 GPT-4, 4 GPT-3.5)
- **Tokens**: ~50,000 total

## Expected Timeline

| Phase | Operation | Duration | Component |
|-------|-----------|----------|-----------|
| 1 | Context retrieval | 0.3s | CORTEX |
| 2 | Orchestration planning | 2.1s | MAESTRO |
| 3 | Data retrieval | 5.4s | FLUX + MongoDB |
| 4 | Data transformation | 3.2s | FLUX |
| 5 | Segmentation analysis | 15.8s | FLUX + LLM |
| 6 | Insight generation | 12.3s | LLM |
| 7 | Chart creation | 1.4s | FLUX |
| 8 | Report synthesis | 5.2s | LLM |
| 9 | Memory storage | 1.3s | CORTEX (async) |
| **Total** | **End-to-end** | **~47s** | **All systems** |

## Sample Customer Data Schema

```javascript
{
  "_id": ObjectId("..."),
  "customerId": "CUST001",
  "name": "John Doe",
  "email": "john@example.com",
  "age": 34,
  "location": "New York",
  "totalPurchases": 12,
  "totalSpent": 1250.50,
  "lastPurchaseDate": ISODate("2024-01-15"),
  "registrationDate": ISODate("2022-03-10"),
  "segment": null, // To be populated by analysis
  "tags": ["premium", "active"],
  "metadata": {
    "source": "web",
    "referrer": "google"
  }
}
```

## Segmentation Approach

### RFM Analysis
- **Recency**: Days since last purchase
- **Frequency**: Number of purchases
- **Monetary**: Total amount spent

### Segments
1. **Champions**: High R, F, M
2. **Loyal Customers**: High F, M
3. **Potential Loyalists**: High R, moderate F
4. **At Risk**: Low R, high F, M
5. **Lost**: Low R, F, M

## Implementation Notes

### Route
- **URL**: `/stage`
- **Purpose**: Demonstration and testing environment
- **Access**: Development mode only

### API Endpoints
- `POST /api/stage/seed-data` - Create sample customer data
- `POST /api/stage/run-segmentation` - Execute full orchestration
- `GET /api/stage/results/:executionId` - Fetch results
- `GET /api/stage/metrics/:executionId` - Fetch performance metrics

### Security Considerations
- Test route disabled in production
- Sample data automatically cleaned after 24 hours
- No real customer PII used
- Isolated MongoDB collection (`test_customers`)

## Testing Checklist

- [ ] MongoDB connection established
- [ ] Sample data seeded (1,000+ customers)
- [ ] CORTEX context retrieval working
- [ ] MAESTRO orchestration planning successful
- [ ] FLUX pipeline execution complete
- [ ] LLM analysis generates segments
- [ ] Charts rendered correctly
- [ ] Final report synthesized
- [ ] Metrics tracked in SENTINEL
- [ ] Performance targets met
- [ ] Memory storage in CORTEX

## Metrics to Monitor

### Performance
- Total execution time
- Time per phase
- LLM latency (TTFT)
- Database query time
- Memory retrieval latency

### Cost
- LLM tokens used
- LLM API costs
- Database operations count

### Quality
- Segmentation accuracy
- Insight relevance
- Chart clarity
- Report completeness

## Future Enhancements

1. **Real-time Streaming**: Show phase progress via SSE
2. **Interactive Refinement**: Allow user to adjust segmentation parameters
3. **Export Options**: PDF, Excel, CSV downloads
4. **A/B Testing**: Compare different segmentation algorithms
5. **Batch Processing**: Handle datasets > 100,000 customers
6. **Multi-tenant**: Isolate data per organization

## References

- [CORTEX Architecture](./docs/Regno_CORTEX_Architecture.html)
- [MAESTRO Orchestration](./docs/Regno_MAESTRO_Architecture.html)
- [FLUX Pipelines](./docs/Regno_FLUX_Architecture.html)
- [SENTINEL Monitoring](./docs/Regno_SENTINEL_Architecture.html)
