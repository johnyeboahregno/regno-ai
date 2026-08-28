# MAESTRO Validation & Repair System

## Overview
A comprehensive system to validate, repair, and optimize MAESTRO orchestrations through iterative refinement.

## Goals

### a) Pipeline Creation
**Goal**: Orchestration creates complete, executable pipelines
- All nodes have proper configurations
- All connections are defined
- Pipeline can run independently from /pipelines route

### b) Phase Validation & Repair
**Goal**: Validate and repair any phase to optimize pipelines
- Each phase has validation check
- Each phase can be repaired/re-run independently
- Repairs propagate to dependent phases

### c) Pipeline Independent Execution
**Goal**: Run pipeline from /pipelines, feed results back to MAESTRO
- Pipeline executes successfully outside MAESTRO
- Results are captured and analyzed
- Feedback improves future orchestrations

### d) Pipeline Execution from MAESTRO
**Goal**: Execute pipeline directly from MAESTRO interface
- One-click execution from orchestration view
- Real-time progress monitoring
- Results displayed inline

### e) Self-Learning System
**Goal**: AI-driven continuous improvement
- Each run improves the system
- Pattern recognition across goals
- Proactive optimization suggestions
- Code evolution recommendations

### f) Comprehensive Documentation
**Goal**: Everything documented for seamless continuation
- Phase structures documented
- Validation rules documented
- Repair strategies documented
- Decision logs maintained

---

## System Architecture

### 1. Phase Validation System

#### Validation Criteria by Phase

**Phase 1: Goal Understanding** (`schema-discovery`)
- ✅ `goal` field is non-empty
- ✅ `successCriteria` array has at least 1 item
- ✅ `requirements` array has at least 1 item
- ✅ All fields are strings

**Phase 2: Capability Discovery** (`enrichment-planning`)
- ✅ `matchedNodes` array exists
- ✅ `missingCapabilities` array exists
- ✅ `nodeCoverage` is between 0-100
- ✅ Each matched node has: type, capabilities, estimatedCost

**Phase 3: Pipeline Planning** (`query-optimization`)
- ✅ `pipelineName` is non-empty
- ✅ `nodes` array has at least 1 node
- ✅ `edges` array exists (can be empty for single-node pipelines)
- ✅ Each node has: id, type, label, config
- ✅ Each edge has: from, to (valid node IDs)
- ✅ `dataFlow` description exists
- ✅ `estimatedCost` object exists

**Phase 4: Pipeline Construction** (`data-collection`)
- ✅ `pipelineId` is valid format (p-maestro-*)
- ✅ `pipelineName` matches Phase 3
- ✅ `nodesCreated` matches Phase 3 nodes count
- ✅ `edgesCreated` matches Phase 3 edges count
- ✅ Pipeline exists in MongoDB
- ✅ Saved pipeline has configs on all nodes
- ✅ Saved pipeline has all connections

**Phase 5: Execution & Validation** (`data-preparation`)
- ✅ `executionId` exists
- ✅ `status` is 'success' or 'partial'
- ✅ `nodesExecuted` > 0
- ✅ `validationChecks` array has items
- ✅ `overallSuccess` is boolean
- ✅ `performanceMetrics` object exists

**Phase 6: Analysis & Improvement** (`insight-generation`)
- ✅ `successRating` is between 0-1
- ✅ `optimizationSuggestions` array exists
- ✅ `strengths` array has items
- ✅ `weaknesses` array has items
- ✅ `iterationNeeded` is boolean

**Phase 7: Gap Analysis** (`schema-discovery`)
- ✅ `identifiedGaps` array exists
- ✅ `recommendedNodeTypes` array exists
- ✅ `priorityLevel` is 'low'|'medium'|'high'
- ✅ `estimatedImpact` object exists

---

### 2. Phase Repair System

#### Repair Strategy by Phase

**Phase 1-4**: Re-run with LLM (requires AI)
- Preserve user's original goal
- Use enhanced prompts based on validation failures
- Keep successful phases intact

**Phase 5**: Re-validate pipeline structure
- Check pipeline exists in DB
- Verify all nodes have configs
- Verify all edges exist
- Can trigger Phase 4 repair if needed

**Phase 6-7**: Re-analyze existing data
- Use existing execution results
- Re-run LLM analysis
- No pipeline changes needed

#### Repair Dependencies
```
Phase 1 → Affects: 2, 3, 4, 5, 6, 7
Phase 2 → Affects: 3, 4, 5, 6, 7
Phase 3 → Affects: 4, 5, 6, 7
Phase 4 → Affects: 5, 6, 7
Phase 5 → Affects: 6, 7
Phase 6 → Affects: 7
Phase 7 → No dependencies
```

When repairing a phase, offer to:
1. Repair just this phase
2. Repair this phase + dependent phases
3. Repair all phases from this point forward

---

### 3. Data Export System

#### Orchestration Info Export Format

```json
{
  "orchestrationId": "maestro-exec-...",
  "goal": "User's goal...",
  "status": "completed|failed",
  "totalDuration": 45000,
  "iterations": 2,
  "pipelineId": "p-maestro-...",
  "pipelineName": "Pipeline Name",

  "phases": [
    {
      "phaseNumber": 1,
      "phaseName": "Goal Understanding",
      "phaseType": "schema-discovery",
      "status": "success|failed|skipped",
      "duration": 2500,
      "validation": {
        "isValid": true,
        "errors": [],
        "warnings": []
      },
      "inputs": {},
      "outputs": {
        "goal": "...",
        "successCriteria": [...],
        "requirements": [...]
      },
      "llmUsage": {
        "calls": 1,
        "inputTokens": 234,
        "outputTokens": 567,
        "totalTokens": 801,
        "estimatedCost": 0.0082
      },
      "reasoning": "..."
    }
  ],

  "pipeline": {
    "id": "p-maestro-...",
    "name": "...",
    "nodes": [...],
    "connections": [...],
    "canExecute": true|false,
    "validationErrors": []
  },

  "llmSummary": {
    "totalCalls": 5,
    "totalTokens": 3456,
    "totalCost": 0.0345,
    "modelsUsed": ["claude-3-5-sonnet-20241022"]
  }
}
```

#### Export Button Locations
1. **Orchestration Level**: Full export (all iterations)
2. **Iteration Level**: Single iteration export
3. **Phase Level**: Single phase detailed export

---

### 4. UI Components

#### Phase Row Enhancements

Each phase row will show:
```
┌─────────────────────────────────────────────────────────────────┐
│ Phase 3: Pipeline Planning                    [✓] 2.5s  $0.012  │
│ 📊 Schema Discovery                                              │
│                                                                   │
│ Status: Success | 5 nodes planned, 4 edges                       │
│                                                                   │
│ [✓ Validate] [🔧 Repair] [📋 Info] [▶️ Details]                  │
└─────────────────────────────────────────────────────────────────┘
```

**Buttons:**
- **✓ Validate**: Run validation checks, show results
- **🔧 Repair**: Re-run phase with corrections
- **📋 Info**: Export phase data JSON
- **▶️ Details**: Expand to show full outputs

#### Orchestration Header Enhancements

```
┌─────────────────────────────────────────────────────────────────┐
│ MongoDB ParamSamplesDoc Analysis                                 │
│ Iteration 2 • Completed in 45.2s • $0.156                        │
│                                                                   │
│ [📥 Export All] [✅ Validate All] [▶️ Execute Pipeline]           │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5. API Endpoints

#### Validation Endpoints
```
POST /api/maestro/validate/execution/:executionId
  - Validates entire orchestration

POST /api/maestro/validate/phase/:executionId/:phaseNumber
  - Validates single phase
  - Returns: { isValid, errors[], warnings[] }
```

#### Repair Endpoints
```
POST /api/maestro/repair/phase/:executionId/:phaseNumber
  - Re-runs single phase
  - Body: { repairDependents: boolean, enhancedPrompt?: string }
  - Returns: new execution data
```

#### Export Endpoints
```
GET /api/maestro/export/execution/:executionId
  - Returns full orchestration JSON

GET /api/maestro/export/phase/:executionId/:phaseNumber
  - Returns single phase detailed JSON
```

#### Pipeline Execution Endpoints
```
POST /api/maestro/execute/:executionId
  - Executes the pipeline from MAESTRO
  - Monitors progress
  - Returns execution results
```

---

### 6. Database Schema Updates

#### Add to `maestro_events` or new `maestro_validations` collection:

```typescript
{
  executionId: string,
  phaseNumber: number,
  validatedAt: Date,
  validation: {
    isValid: boolean,
    errors: string[],
    warnings: string[],
    checks: Array<{
      check: string,
      passed: boolean,
      message: string
    }>
  }
}
```

#### Add to `maestro_repairs` collection:

```typescript
{
  executionId: string,
  phaseNumber: number,
  repairedAt: Date,
  repairReason: string,
  previousOutputs: any,
  newOutputs: any,
  success: boolean,
  newExecutionId?: string
}
```

---

### 7. Implementation Plan

#### Phase 1: Validation System (Week 1)
- [ ] Create validation functions for each phase
- [ ] Add validation API endpoints
- [ ] Add validate button to UI
- [ ] Display validation results
- [ ] Test on existing orchestrations

#### Phase 2: Info Export System (Week 1)
- [ ] Create export functions
- [ ] Add export API endpoints
- [ ] Add export buttons to UI
- [ ] Test JSON format
- [ ] Add copy/download options

#### Phase 3: Repair System (Week 2)
- [ ] Create repair functions for each phase
- [ ] Add repair API endpoints
- [ ] Add repair button to UI
- [ ] Implement repair dependency handling
- [ ] Test repair propagation

#### Phase 4: Pipeline Execution (Week 2)
- [ ] Add execute button to MAESTRO
- [ ] Create execution monitor
- [ ] Display execution results
- [ ] Feed results back for analysis

#### Phase 5: Self-Learning (Week 3)
- [ ] Track successful patterns
- [ ] Analyze failures
- [ ] Generate optimization suggestions
- [ ] Implement feedback loops

#### Phase 6: Documentation (Ongoing)
- [ ] Document each phase structure
- [ ] Document validation rules
- [ ] Document repair strategies
- [ ] Create decision logs

---

## Current Issues & Fixes

### Issue 1: Empty Pipeline Configs (Phase 3 → Phase 4)
**Problem**: Pipelines created without node configs or connections

**Diagnostic Steps**:
1. ✅ Add validation to Phase 3 output
2. Check if LLM is generating configs
3. Check if parsing is working
4. Check if Phase 4 is using configs

**Repair Steps**:
1. Re-run Phase 3 with enhanced prompt
2. Validate Phase 3 output before proceeding
3. Re-run Phase 4 if needed

### Issue 2: Pipeline Reuse Not Executing
**Problem**: Phase 5 validates but doesn't execute

**Current State**:
- ✅ Pipeline reuse detection works
- ✅ Stub phases created
- ✅ Phase 5 validates structure
- ⚠️ Phase 5 doesn't execute pipeline

**Future Enhancement**:
- Add actual execution to Phase 5
- Or make Phase 5 optional in reuse mode
- Focus on Phase 6-7 improvements

---

## Next Steps

1. **Immediate**: Implement validation for Phase 3
   - Check if nodes have configs
   - Check if edges are defined
   - Expose this data via export

2. **Short-term**: Add validation/export UI
   - Add buttons to each phase
   - Show validation results
   - Enable JSON export

3. **Medium-term**: Implement repair system
   - Re-run individual phases
   - Propagate to dependents
   - Track repair history

4. **Long-term**: Self-learning system
   - Pattern recognition
   - Automatic optimization
   - Code evolution

---

## Testing Strategy

### Manual Testing
1. Run orchestration
2. Export phase data
3. Validate each phase
4. Repair failing phases
5. Verify repairs work

### Automated Testing
1. Unit tests for validation functions
2. Integration tests for repair system
3. E2E tests for full workflow

---

## Success Metrics

### Phase Completion Rate
- Goal: 100% of phases produce valid outputs
- Current: ~70% (Phase 3-4 issues)

### Pipeline Execution Rate
- Goal: 100% of pipelines execute successfully
- Current: Unknown (need to test)

### Repair Success Rate
- Goal: 90% of repairs succeed on first attempt
- Current: N/A (not implemented)

### Self-Learning Improvement
- Goal: 20% reduction in failures per week
- Current: N/A (not tracking yet)

---

## Notes

- All orchestrations are non-production, safe to iterate
- Focus on getting Phase 3 → Phase 4 working first
- Then add validation/repair UI
- Then work on execution and feedback
- Document everything along the way
