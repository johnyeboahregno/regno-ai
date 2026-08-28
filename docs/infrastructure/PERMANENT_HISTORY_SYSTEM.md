# Permanent History System

## Overview

The Permanent History System ensures that critical data (especially LLM usage) is **NEVER DELETED**, even when executions, pipelines, or other transient data is removed. This is essential for:

- **Cost Tracking**: Permanent record of all LLM spending
- **Usage Analytics**: Long-term analysis of LLM usage patterns
- **Compliance & Auditing**: Immutable audit trail for compliance
- **Business Intelligence**: Historical data for decision-making

## Architecture

### Reference-Based Storage (No Duplication!)

The system uses a **reference-based architecture** to avoid data duplication:

1. **Single Source of Truth**: ALL LLM data is stored ONLY in `_history`
2. **References Everywhere**: Other collections store only MongoDB `_id` references
3. **Protected from Deletion**: Records are marked `_protected: true` and cannot be deleted accidentally

### Collections

- **`_history`** - The permanent collection that stores immutable records
  - Documents have a `type` field for future extensibility
  - Currently supports: `'llm'` (future: `'webhook'`, `'pipeline_execution'`, `'user_action'`, etc.)
  - All records are `_protected: true` by default

- **`pipeline_history`** - Stores execution metadata with `auditTrailRefs` (array of _history IDs)
- **`pipeline_nodes`** - Stores node execution metadata with `auditTrailRefs` (array of _history IDs)

### Automatic Logging

**Every LLM call** from **anywhere in the app** is automatically logged to `_history`:

✅ MAESTRO orchestrations
✅ Expert nodes
✅ Agent nodes
✅ Chat conversations
✅ Direct API calls
✅ Any feature using `callLLM()` from `llmService.ts`

### How It Works

```
LLM Call
   ↓
1. Save to _history (returns ID: "507f1f77bcf86cd799439011")
   ↓
2. Save to pipeline_nodes with reference:
   {
     metadata: {
       auditTrailRefs: ["507f1f77bcf86cd799439011"],
       auditTrails: [{
         _ref: "507f1f77bcf86cd799439011", // Reference to _history
         model: "gpt-4o",
         totalTokens: 2300,
         cost: 0.0345,
         // ... minimal summary data only
       }]
     }
   }
```

**Benefits:**
- ✅ No data duplication (save storage space)
- ✅ Single source of truth for LLM data
- ✅ Can delete executions without losing LLM audit trail
- ✅ Fast queries by reference
- ✅ Protected from accidental deletion

### Data Captured (LLM Calls)

```typescript
{
  type: 'llm',
  timestamp: '2025-01-09T12:00:00.000Z',
  userId: 'user123',

  // LLM Details
  credentialId: 'cred456',
  provider: 'openai',
  model: 'gpt-4o',

  // Token Usage
  inputTokens: 1500,
  outputTokens: 800,
  totalTokens: 2300,

  // Cost
  estimatedCost: 0.0345,

  // Performance
  duration: 2340, // milliseconds

  // Success/Failure
  success: true,
  error: null,

  // Optional: Truncated Input/Output (first 500 chars)
  prompt: 'You are an AI assistant...',
  response: 'Here is my response...',

  // Context - where this call came from
  context: {
    nodeId: 'node789',
    nodeType: 'maestro',
    pipelineId: 'pipeline123',
    executionId: 'exec456',
    purpose: 'maestro_phase',
    phase: 'schema-discovery'
  },

  // Metadata - flexible additional data
  metadata: {
    source: 'llm_service',
    tags: ['production', 'critical'],
    goal: 'Create data pipeline'
  }
}
```

## Files Created

### 1. Permanent History Service
**`src/lib/server/services/permanentHistory.ts`**

Provides methods for:
- `saveLLMCall()` - Save an LLM call record
- `getLLMHistory()` - Query LLM history with filters
- `getLLMStatistics()` - Get aggregated statistics
- `saveRecord()` - Generic method for future record types
- `getRecords()` - Query any record type
- `deleteOldRecords()` - GDPR compliance (use carefully!)

### 2. Updated LLM Service
**`src/lib/server/services/llmService.ts`**

The `logLLMCall()` function uses a **reference-based approach**:
1. **Saves to `_history` FIRST** (returns MongoDB `_id`)
2. **Stores reference** in `pipeline_nodes` (via `auditTrailRefs` array and `_ref` field in audit trail)
3. Only minimal summary data is stored in `pipeline_nodes` (model, tokens, cost, duration)
4. Full data (prompt, response, etc.) lives ONLY in `_history`

### 3. Migration Script
**`scripts/migrate-llm-to-permanent-history.js`**

Migrates ALL existing LLM call data using reference-based architecture:

**What it does:**
1. Extracts LLM audit trails from `pipeline_history` and `pipeline_nodes`
2. Creates permanent records in `_history` (marked `_protected: true`)
3. Replaces full audit trail data in source collections with references (`_ref` field)
4. Removes large fields (prompt, response, input, output) from source collections
5. Updates source collections to point to `_history` via `auditTrailRefs`

**Result:**
- All LLM data lives in `_history` (single source of truth)
- Other collections have only lightweight references
- Massive storage savings (no duplication)

### 4. Test Script
**`scripts/test-permanent-history.js`**

Verifies the system is working and shows statistics.

## Usage

### Run Migration (One-Time)

```bash
# Dry run first to see what would be migrated
node scripts/migrate-llm-to-permanent-history.js --dry-run

# Actually migrate the data
node scripts/migrate-llm-to-permanent-history.js

# Force overwrite existing records
node scripts/migrate-llm-to-permanent-history.js --force
```

### Test the System

```bash
node scripts/test-permanent-history.js
```

### Query LLM History (Example API Endpoint)

```typescript
import { permanentHistory } from '$lib/server/services/permanentHistory';

// Get LLM history for a user
const history = await permanentHistory.getLLMHistory({
  userId: 'user123',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-01-31'),
  limit: 100
});

// Get statistics
const stats = await permanentHistory.getLLMStatistics({
  userId: 'user123',
  groupBy: 'model' // or 'provider', 'day', 'week', 'month'
});

console.log('Total cost:', stats.totalCost);
console.log('By model:', stats.byModel);
```

## Future Extensibility

The system is designed to support additional record types:

### Webhook History
```typescript
await permanentHistory.saveRecord({
  type: 'webhook',
  userId: 'user123',
  metadata: {
    webhookId: 'webhook456',
    event: 'pipeline.completed',
    payload: {...}
  }
});
```

### Pipeline Execution History
```typescript
await permanentHistory.saveRecord({
  type: 'pipeline_execution',
  userId: 'user123',
  metadata: {
    pipelineId: 'pipeline789',
    duration: 5000,
    success: true,
    ...
  }
});
```

### User Actions
```typescript
await permanentHistory.saveRecord({
  type: 'user_action',
  userId: 'user123',
  metadata: {
    action: 'created_pipeline',
    details: {...}
  }
});
```

## Database Indexes

The migration script automatically creates these indexes for performance:

```javascript
- { type: 1, timestamp: -1 }
- { type: 1, userId: 1, timestamp: -1 }
- { type: 1, provider: 1, timestamp: -1 }
- { type: 1, model: 1, timestamp: -1 }
- { 'context.executionId': 1 }
- { 'context.pipelineId': 1 }
```

## Deletion Protection

All records in `_history` are marked `_protected: true` and **CANNOT be deleted** by normal operations:

```typescript
// This will NOT delete protected records (default behavior)
await permanentHistory.deleteOldRecords('llm', twoYearsAgo);
// Deleted: 0 (protected records are skipped)

// To actually delete (use with EXTREME caution!)
await permanentHistory.deleteOldRecords('llm', twoYearsAgo, { force: true });
// Deleted: 123 (WARNING: Permanent!)
```

### Manually protect/unprotect records

```typescript
// Protect a specific record
await permanentHistory.protectRecord('507f1f77bcf86cd799439011');

// Unprotect (use with caution!)
await permanentHistory.unprotectRecord('507f1f77bcf86cd799439011');
```

## Querying by Reference

To get full LLM data from a reference:

```typescript
import { permanentHistory } from '$lib/server/services/permanentHistory';

// Get a single LLM call by ID
const llmCall = await permanentHistory.getLLMCallById('507f1f77bcf86cd799439011');

// Get multiple LLM calls by IDs
const refs = execution.metadata.auditTrailRefs; // ['id1', 'id2', 'id3']
const llmCalls = await permanentHistory.getLLMCallsByIds(refs);

// Now you have full details: prompt, response, tokens, cost, etc.
llmCalls.forEach(call => {
  console.log(`Model: ${call.model}, Tokens: ${call.totalTokens}, Cost: $${call.estimatedCost}`);
});
```

## Benefits

1. **Cost Accountability**: Track every dollar spent on LLM calls
2. **Usage Patterns**: Identify which features use most tokens
3. **Model Comparison**: Compare costs/performance across models
4. **Audit Trail**: Immutable record of all AI operations
5. **Analytics**: Build dashboards showing LLM usage over time
6. **Debugging**: Trace specific executions even after deletion
7. **Compliance**: Meet regulatory requirements for AI usage tracking

## Example Queries

### Total cost this month
```typescript
const thisMonth = new Date();
thisMonth.setDate(1);
thisMonth.setHours(0, 0, 0, 0);

const stats = await permanentHistory.getLLMStatistics({
  startDate: thisMonth
});

console.log('This month cost:', stats.totalCost);
```

### Most expensive model
```typescript
const stats = await permanentHistory.getLLMStatistics({
  groupBy: 'model'
});

const sorted = Object.entries(stats.byModel)
  .sort((a, b) => b[1].cost - a[1].cost);

console.log('Most expensive model:', sorted[0]);
```

### Failed LLM calls
```typescript
const collection = await getMongoCollection('_history');
const failed = await collection.find({
  type: 'llm',
  success: false
}).toArray();

console.log('Failed calls:', failed.length);
```

## Security Considerations

- **Truncation**: Prompts/responses are truncated to 500 chars to prevent storage bloat and sensitive data leakage
- **Access Control**: Add user-level permissions when querying
- **Encryption**: Consider encrypting sensitive fields at rest
- **GDPR**: Implement `deleteOldRecords()` for user data deletion requests

## Monitoring

Monitor the `_history` collection size:

```bash
# Check collection size
db._history.stats()

# Check record counts
db._history.countDocuments({ type: 'llm' })

# Check recent records
db._history.find({ type: 'llm' }).sort({ timestamp: -1 }).limit(10)
```

## Next Steps

1. ✅ Run migration script to import existing LLM data
2. ✅ Test with `test-permanent-history.js`
3. 🔄 Build UI dashboard for LLM cost tracking
4. 🔄 Add API endpoints for querying history
5. 🔄 Set up automated reports (daily/weekly/monthly costs)
6. 🔄 Implement data retention policies
7. 🔄 Add more record types (webhooks, pipeline executions, etc.)

## Support

For questions or issues:
- Check logs: Look for `[LLM Service]` log entries
- Verify collection: Use MongoDB Compass to inspect `_history`
- Test script: Run `test-permanent-history.js` to verify system health
