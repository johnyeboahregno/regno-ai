# Truncation Prevention Strategies

## Root Causes of Truncation

### 1. **Token Output Limits**
LLMs have hard limits on output tokens:
- GPT-3.5/4: ~4096 output tokens
- Claude 2: ~8192 output tokens
- Claude 3: ~16384 output tokens

**Problem:** When response exceeds limit, it gets cut mid-sentence

### 2. **Complex Task Overload**
Asking for too much in a single request:
- "Analyze this, generate that, explain everything, provide examples"
- Multiple deliverables in one response
- Deeply nested structures

### 3. **Verbose Prompting**
System prompts consume available space:
- Long instruction sets
- Detailed examples
- Extensive context
- Multiple tool definitions

### 4. **Structured Output Overhead**
JSON/XML formats add syntax tokens:
```json
{
  "summary": "...",
  "findings": ["...", "...", "..."],
  "recommendations": ["...", "..."],
  "detailed_analysis": {
    "section1": {...},
    "section2": {...}
  }
}
```
- Braces, brackets, quotes add 20-30% overhead
- Nested structures multiply the cost

### 5. **Context Window Pressure**
Large input context reduces output space:
- Total tokens = Input + Output
- More input → Less output available
- File uploads, chat history eat space

## Best Practice Methodologies

### Strategy 1: **Intelligent Task Decomposition**

**Concept:** Break complex tasks into smaller, focused subtasks

**Implementation:**
```javascript
// BEFORE (Prone to truncation):
{
  goal: "Analyze database, design schema, write migration script, document everything",
  mode: "single-shot"
}

// AFTER (Decomposed):
{
  phases: [
    { task: "Analyze current database structure", maxTokens: 2000 },
    { task: "Design optimal schema", maxTokens: 2000 },
    { task: "Generate migration script", maxTokens: 3000 },
    { task: "Write documentation", maxTokens: 2000 }
  ]
}
```

**Benefits:**
- Each phase has dedicated token budget
- Failures isolated to single phase
- Progressive results visible
- Natural checkpoints

**In Maestro:**
```typescript
// Detect complex goal upfront
function analyzeGoalComplexity(goal: string): {
  complexity: 'simple' | 'medium' | 'complex';
  suggestedPhases: string[];
  estimatedTokens: number;
} {
  // Count action verbs (analyze, create, design, document, etc.)
  const actionVerbs = goal.match(/\b(analyze|create|design|build|document|generate|implement|develop|test)\b/gi);

  if (actionVerbs && actionVerbs.length > 3) {
    return {
      complexity: 'complex',
      suggestedPhases: actionVerbs.map(verb => `Phase: ${verb}`),
      estimatedTokens: actionVerbs.length * 2000
    };
  }

  // More heuristics...
}

// Pre-emptive decomposition
if (goalComplexity === 'complex') {
  showWarning(`This goal is complex. Consider breaking it into ${suggestedPhases.length} phases to avoid truncation.`);
  offerAutoDecomposition();
}
```

### Strategy 2: **Progressive Response Pattern**

**Concept:** Request summaries first, details on-demand

**Implementation:**
```javascript
// Phase 1: Get overview
const overview = await llm.complete({
  prompt: "Provide a brief summary (max 500 tokens) of the analysis",
  maxTokens: 600
});

// Phase 2: User selects which details to expand
const expandedSections = await Promise.all(
  userSelectedSections.map(section =>
    llm.complete({
      prompt: `Provide detailed analysis of: ${section}`,
      maxTokens: 2000
    })
  )
);
```

**Benefits:**
- Always get something useful
- User controls detail level
- Efficient token usage
- No truncation on overview

**Example Flow:**
1. LLM returns: "Analysis revealed 5 key findings: A, B, C, D, E"
2. User clicks: "Expand finding B and C"
3. LLM returns: Detailed explanation of B and C
4. No truncation because focused request

### Strategy 3: **Streaming with Continuation**

**Concept:** Monitor streaming responses, auto-continue when needed

**Implementation:**
```typescript
async function streamWithContinuation(prompt: string): Promise<string> {
  let fullResponse = '';
  let continuePrompt = prompt;
  let iterations = 0;
  const MAX_ITERATIONS = 5;

  while (iterations < MAX_ITERATIONS) {
    const stream = await llm.streamComplete({
      prompt: continuePrompt,
      maxTokens: 4000
    });

    let chunkResponse = '';
    let lastCompleteSection = '';

    for await (const chunk of stream) {
      chunkResponse += chunk;

      // Track last complete JSON object/sentence
      if (chunk.includes('}') || chunk.includes('.')) {
        lastCompleteSection = chunkResponse;
      }
    }

    fullResponse += chunkResponse;

    // Check if truncated
    if (detectTruncation(chunkResponse)) {
      // Continue from last complete section
      continuePrompt = `Continue from where you left off. Previous content ends with: "${lastCompleteSection.slice(-200)}"`;
      iterations++;
    } else {
      break; // Complete response
    }
  }

  return fullResponse;
}
```

**Benefits:**
- Seamless continuation
- User doesn't see truncation
- Automatic retry
- Preserves context

### Strategy 4: **Adaptive Token Budgeting**

**Concept:** Dynamically allocate tokens based on task complexity

**Implementation:**
```typescript
function estimateRequiredTokens(task: {
  type: 'analysis' | 'generation' | 'transformation';
  inputSize: number;
  outputFormat: 'text' | 'json' | 'code';
  complexity: 'low' | 'medium' | 'high';
}): number {
  const baseTokens = {
    analysis: 1500,
    generation: 2500,
    transformation: 2000
  };

  const formatMultiplier = {
    text: 1.0,
    json: 1.3,  // JSON adds ~30% overhead
    code: 1.5   // Code needs more space
  };

  const complexityMultiplier = {
    low: 1.0,
    medium: 1.5,
    high: 2.5
  };

  let estimate = baseTokens[task.type];
  estimate *= formatMultiplier[task.outputFormat];
  estimate *= complexityMultiplier[task.complexity];

  // Add buffer for input context
  estimate += Math.min(task.inputSize * 0.1, 1000);

  return Math.ceil(estimate);
}

// Use in execution
const estimatedTokens = estimateRequiredTokens(task);
const safeTokenLimit = Math.min(estimatedTokens * 1.2, MAX_TOKENS); // 20% buffer

await llm.complete({
  prompt: task.prompt,
  maxTokens: safeTokenLimit
});
```

**Benefits:**
- Right-sized token allocation
- Reduces waste on simple tasks
- Prevents truncation on complex tasks
- Smart buffer management

### Strategy 5: **Output Format Optimization**

**Concept:** Use compact, efficient formats

**INEFFICIENT:**
```json
{
  "analysis": {
    "findings": {
      "finding_1": {
        "title": "Performance Issue",
        "description": "The system exhibits slow response times...",
        "severity": "high",
        "recommendation": "Optimize database queries..."
      },
      "finding_2": {...},
      "finding_3": {...}
    }
  }
}
```
**Token cost:** ~500 tokens for structure + content

**EFFICIENT:**
```json
{
  "findings": [
    {
      "title": "Performance Issue",
      "desc": "Slow response times",
      "sev": "high",
      "fix": "Optimize queries"
    },
    {...},
    {...}
  ]
}
```
**Token cost:** ~300 tokens (40% savings!)

**Implementation:**
- Use abbreviated keys
- Flat structures over nested
- Arrays instead of objects with numbered keys
- Remove unnecessary wrapping

### Strategy 6: **Prompt Engineering for Conciseness**

**BAD PROMPT:**
```
Analyze the database and provide a comprehensive report including:
1. A detailed summary of the current state with all tables, columns, and relationships
2. An in-depth analysis of performance issues with specific examples
3. Detailed recommendations for each finding with step-by-step implementation guides
4. Code examples for all suggested changes
5. A comprehensive risk assessment for each recommendation
6. Expected outcomes with metrics and KPIs
```
**Result:** Guaranteed truncation!

**GOOD PROMPT:**
```
Analyze database. Return JSON:
{
  "summary": "<1 sentence>",
  "issues": ["<brief>", ...],
  "fixes": ["<action>", ...],
  "priority": ["issue_id", ...]
}
Max 100 words per field.
```
**Result:** Fits in 1000 tokens!

**Techniques:**
- Set explicit length limits
- Request bullet points not paragraphs
- Use "brief" and "concise" keywords
- Specify token budgets per section

### Strategy 7: **Pre-Execution Warning System**

**Concept:** Warn users before likely truncation

**Implementation:**
```typescript
function predictTruncationRisk(request: {
  goal: string;
  context: string;
  selectedModel: string;
  maxTokens: number;
}): {
  risk: 'low' | 'medium' | 'high';
  reason: string;
  suggestions: string[];
} {
  const signals = [];

  // Signal 1: Word count
  const wordCount = request.goal.split(/\s+/).length;
  if (wordCount > 50) {
    signals.push({ risk: 'medium', reason: 'Goal is very detailed (>50 words)' });
  }

  // Signal 2: Multiple verbs
  const verbs = ['analyze', 'create', 'design', 'document', 'generate', 'implement'];
  const verbCount = verbs.filter(v => request.goal.toLowerCase().includes(v)).length;
  if (verbCount > 2) {
    signals.push({ risk: 'high', reason: `Multiple complex actions (${verbCount})` });
  }

  // Signal 3: Large context
  if (request.context.length > 10000) {
    signals.push({ risk: 'medium', reason: 'Large input context reduces output space' });
  }

  // Signal 4: Low token limit
  if (request.maxTokens < 4000) {
    signals.push({ risk: 'medium', reason: 'Low token limit (<4000)' });
  }

  // Calculate overall risk
  const highRiskCount = signals.filter(s => s.risk === 'high').length;
  const mediumRiskCount = signals.filter(s => s.risk === 'medium').length;

  if (highRiskCount > 0 || mediumRiskCount > 2) {
    return {
      risk: 'high',
      reason: signals.map(s => s.reason).join('; '),
      suggestions: [
        'Break goal into smaller phases',
        'Increase max tokens to 8000+',
        'Simplify goal to focus on one primary action',
        'Use progressive detail mode'
      ]
    };
  }

  return { risk: 'low', reason: 'Task appears manageable', suggestions: [] };
}

// Use before execution
const risk = predictTruncationRisk(orchestrationRequest);
if (risk.risk === 'high') {
  showWarning({
    title: 'High Truncation Risk',
    message: risk.reason,
    suggestions: risk.suggestions,
    actions: [
      { label: 'Decompose Automatically', action: autoDecompose },
      { label: 'Increase Tokens', action: () => setTokens(8000) },
      { label: 'Continue Anyway', action: proceed }
    ]
  });
}
```

### Strategy 8: **Dynamic Phase Insertion**

**Concept:** LLM detects it needs more space and requests continuation

**Implementation:**
```typescript
// In system prompt:
`
If your response is getting too long, you may:
1. End with special marker: "[CONTINUATION_NEEDED: <brief reason>]"
2. Provide what you've completed so far
3. System will automatically continue in next phase

Example:
{
  "analysis": "...",
  "findings": ["...", "..."],
  "[CONTINUATION_NEEDED: Need to provide detailed recommendations]"
}
`

// Detection in code:
if (response.includes('[CONTINUATION_NEEDED:')) {
  const reason = response.match(/\[CONTINUATION_NEEDED: (.+?)\]/)[1];

  // Auto-create continuation phase
  const continuationPhase = {
    phase: `Continue: ${reason}`,
    prompt: `Continue from previous response. Focus on: ${reason}. Previous content: ${response.slice(0, 500)}...`,
    maxTokens: 4000
  };

  phases.insert(currentPhaseIndex + 1, continuationPhase);
}
```

## Recommended Implementation Priority

### Phase 1: **Immediate (Quick Wins)**
1. ✅ Intelligent retry (DONE)
2. ⚠️ Pre-execution warning
3. ⚠️ Output format optimization
4. ⚠️ Prompt engineering guidelines

### Phase 2: **Short-term (1-2 weeks)**
1. ⚠️ Goal complexity analysis
2. ⚠️ Auto-decomposition suggestions
3. ⚠️ Adaptive token budgeting
4. ⚠️ Progressive detail mode

### Phase 3: **Medium-term (1 month)**
1. ⚠️ Streaming with continuation
2. ⚠️ Dynamic phase insertion
3. ⚠️ Token usage analytics
4. ⚠️ Smart chunking system

### Phase 4: **Long-term (Future)**
1. ⚠️ ML-based truncation prediction
2. ⚠️ Automatic response combination
3. ⚠️ Context compression
4. ⚠️ Intelligent caching

## Practical Code Examples

### Example 1: Goal Decomposition Helper

```typescript
function suggestGoalDecomposition(goal: string): {
  shouldDecompose: boolean;
  suggestedPhases: Array<{ name: string; description: string; estimatedTokens: number }>;
} {
  // Parse goal for action words
  const actions = extractActions(goal);

  if (actions.length <= 2) {
    return { shouldDecompose: false, suggestedPhases: [] };
  }

  // Create phases for each action
  const phases = actions.map((action, i) => ({
    name: `Phase ${i + 1}: ${action.verb} ${action.target}`,
    description: action.description,
    estimatedTokens: estimateTokensForAction(action)
  }));

  return {
    shouldDecompose: true,
    suggestedPhases: phases
  };
}
```

### Example 2: Compact Response Format

```typescript
// Add to system prompt:
const COMPACT_FORMAT_INSTRUCTION = `
IMPORTANT: Use compact format to prevent truncation:
- Use abbreviated keys: "desc" not "description", "rec" not "recommendation"
- Use arrays not objects with numbered keys
- Limit text fields to 100 words unless specifically asked
- Use bullet points (•) instead of full sentences where possible
- Omit empty fields

Example:
{
  "sum": "Brief summary",
  "find": ["Issue 1", "Issue 2"],
  "fix": ["Solution 1", "Solution 2"]
}
`;
```

### Example 3: Smart Token Allocation

```typescript
function allocateTokensBudget(phases: Phase[]): Phase[] {
  const TOTAL_BUDGET = 16000;
  const BUFFER = 2000;
  const AVAILABLE = TOTAL_BUDGET - BUFFER;

  // Estimate complexity of each phase
  const complexities = phases.map(p => estimateComplexity(p));
  const totalComplexity = complexities.reduce((sum, c) => sum + c, 0);

  // Allocate proportionally
  return phases.map((phase, i) => ({
    ...phase,
    maxTokens: Math.floor((complexities[i] / totalComplexity) * AVAILABLE)
  }));
}
```

## Conclusion

**Key Insights:**
1. **Prevention > Cure**: Better to avoid truncation than handle it
2. **Decomposition is King**: Break complex tasks into manageable pieces
3. **Format Matters**: Compact formats save 30-40% tokens
4. **Predict Early**: Warn users before execution
5. **Adaptive Budgeting**: Right-size token allocations

**Recommended Next Steps:**
1. Implement pre-execution risk analysis
2. Add goal decomposition suggestions
3. Optimize output format templates
4. Create smart token budgeting
5. Build progressive detail mode

These strategies will dramatically reduce truncation incidents while improving overall system efficiency and user experience!
