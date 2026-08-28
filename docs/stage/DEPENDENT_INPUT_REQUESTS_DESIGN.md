# Dependent Input Requests - Design

## Problem

Current system shows all input requests at once:
```typescript
userInputRequests = [
  { type: 'data_source', required: true },
  { type: 'clarification', required: true }
]
```

But we need **sequential dependencies** where Input B is calculated AFTER Input A is provided.

## Real-World Scenarios

### Scenario 1: Data Analysis Pipeline
```
Step 1: Select data source (MongoDB credential + database + collection)
  ↓ Once selected → Analyze schema
Step 2: Which fields to analyze? (depends on schema from Step 1)
  ↓ Once selected → Detect field types
Step 3: Aggregation strategy? (depends on field types from Step 2)
  ↓ Once selected → Generate aggregation config
Step 4: Visualization preferences? (depends on aggregation from Step 3)
```

### Scenario 2: API Integration
```
Step 1: Select API endpoint
  ↓ Once selected → Fetch endpoint schema
Step 2: Map input parameters? (depends on endpoint schema)
  ↓ Once mapped → Validate mapping
Step 3: Transform output? (depends on response structure)
```

## Solution: Dependency Chain

### 1. Input Request Structure with Dependencies

```typescript
interface UserInputRequest {
  type: string;
  description: string;
  required: boolean;

  // NEW: Dependency system
  dependsOn?: string[]; // IDs of inputs that must be resolved first
  recalculate?: boolean; // If true, regenerate this input when dependencies change
  requestId: string; // Unique ID for this input request

  // Existing fields
  questions?: any[];
  reason?: string;

  // NEW: State tracking
  status?: 'pending' | 'active' | 'completed' | 'recalculating';
  providedValue?: any; // Store the user's answer
}
```

### 2. Example Usage

```typescript
// Phase sets up a dependency chain
outputs.userInputRequests = [
  {
    requestId: 'data_source',
    type: 'data_source',
    description: 'Select data source',
    required: true,
    status: 'active' // Show this immediately
  },
  {
    requestId: 'field_selection',
    type: 'clarification',
    description: 'Which fields should we analyze?',
    required: true,
    dependsOn: ['data_source'], // Wait for data source first
    recalculate: true, // Regenerate questions based on schema
    status: 'pending', // Hidden until data_source is resolved
    questions: [] // Will be populated after data_source is selected
  },
  {
    requestId: 'aggregation_method',
    type: 'clarification',
    description: 'How should we aggregate the data?',
    required: true,
    dependsOn: ['field_selection'], // Wait for fields to be selected
    recalculate: true,
    status: 'pending',
    questions: []
  },
  {
    requestId: 'visualization',
    type: 'clarification',
    description: 'Visualization preferences',
    required: false,
    dependsOn: ['aggregation_method'],
    recalculate: true,
    status: 'pending',
    questions: []
  }
];
```

### 3. Frontend Flow

```typescript
// When user provides an input (e.g., selects data source)
async function handleInputProvided(requestId: string, value: any) {
  const request = phase.outputs.userInputRequests.find(r => r.requestId === requestId);
  if (!request) return;

  // 1. Mark this input as completed
  request.status = 'completed';
  request.providedValue = value;

  // 2. Find dependent inputs
  const dependentInputs = phase.outputs.userInputRequests.filter(
    r => r.dependsOn?.includes(requestId) && r.recalculate
  );

  // 3. Trigger recalculation for dependent inputs
  for (const dependent of dependentInputs) {
    dependent.status = 'recalculating';

    // Call backend to regenerate this input based on provided values
    const regeneratedInput = await recalculateInputRequest(
      phase.num,
      dependent.requestId,
      getAllProvidedInputs(phase)
    );

    // Update the input with regenerated questions/config
    Object.assign(dependent, regeneratedInput);
    dependent.status = 'active'; // Now show it
  }

  // 4. Update UI to show next active input
  updateInputRequestsUI();
}
```

### 4. Backend API for Recalculation

```typescript
// POST /api/stage/phases/:phaseNum/recalculate-input
export async function recalculateInputRequest(
  phaseNumber: number,
  requestId: string,
  providedInputs: Record<string, any>
) {
  // Example: Recalculate field_selection based on data_source
  if (requestId === 'field_selection' && providedInputs.data_source) {
    const { credentialId, database, collection } = providedInputs.data_source;

    // Analyze schema
    const schema = await analyzeSchema(credentialId, database, collection);

    // Generate field selection questions based on schema
    const questions = schema.fields.map(field => ({
      id: `field_${field.name}`,
      question: `Include "${field.name}" (${field.type}) in analysis?`,
      type: 'boolean',
      default: field.isNumeric // Auto-select numeric fields
    }));

    return {
      requestId: 'field_selection',
      type: 'clarification',
      description: `Select fields from ${collection} to analyze`,
      questions,
      required: true,
      status: 'active'
    };
  }

  // Example: Recalculate aggregation_method based on field_selection
  if (requestId === 'aggregation_method' && providedInputs.field_selection) {
    const selectedFields = providedInputs.field_selection;

    // Determine aggregation options based on selected field types
    const questions = [{
      id: 'aggregation_strategy',
      question: 'How should we aggregate the data?',
      type: 'select',
      options: [
        { value: 'sum', label: 'Sum' },
        { value: 'average', label: 'Average' },
        { value: 'count', label: 'Count' },
        { value: 'min_max', label: 'Min/Max' }
      ]
    }];

    return {
      requestId: 'aggregation_method',
      type: 'clarification',
      description: 'Choose aggregation method',
      questions,
      required: true,
      status: 'active'
    };
  }
}
```

### 5. UI Display Logic

```svelte
<!-- Show inputs in order, respecting dependencies -->
{#each userInputRequests.filter(r => r.status === 'active' || r.status === 'completed') as request}
  <div class="input-request-card">
    {#if request.status === 'completed'}
      <!-- Show completed input with checkmark and summary -->
      <div class="completed-input">
        <div class="flex items-center gap-2">
          <CheckCircle class="text-green-500" />
          <h5>{request.description}</h5>
        </div>
        <div class="text-xs text-gray-400">
          ✓ {formatProvidedValue(request.providedValue)}
        </div>
        <button onclick={() => editInput(request.requestId)}>
          Edit
        </button>
      </div>

    {:else if request.status === 'recalculating'}
      <!-- Show loading state while regenerating -->
      <div class="recalculating-input">
        <Loader class="animate-spin" />
        <span>Analyzing previous input...</span>
      </div>

    {:else if request.status === 'active'}
      <!-- Show active input for user to complete -->
      <div class="active-input">
        <h5>{request.description}</h5>

        {#if request.type === 'data_source'}
          <DataSourceSelector onSelect={(value) => handleInputProvided(request.requestId, value)} />

        {:else if request.type === 'clarification'}
          <ClarificationPanel
            questions={request.questions}
            onSubmit={(answers) => handleInputProvided(request.requestId, answers)}
          />
        {/if}
      </div>
    {/if}
  </div>
{/each}

<!-- Show pending inputs (grayed out, not interactive) -->
{#if userInputRequests.some(r => r.status === 'pending')}
  <div class="pending-inputs-preview">
    <h6 class="text-xs text-gray-500">Next steps:</h6>
    {#each userInputRequests.filter(r => r.status === 'pending') as pending}
      <div class="text-xs text-gray-600">
        {pending.order}. {pending.description}
        <span class="text-gray-500">(depends on previous input)</span>
      </div>
    {/each}
  </div>
{/if}
```

## Benefits

1. **Contextual Inputs** - Each input is based on real data from previous inputs
2. **Smart Defaults** - Can auto-select based on analysis (e.g., numeric fields)
3. **Progressive Disclosure** - Don't overwhelm user with all questions at once
4. **Dynamic Adaptation** - Questions change based on actual data
5. **Guided Flow** - Clear progression through steps

## Implementation Plan

### Phase 1: Core Structure
- [ ] Add `requestId`, `dependsOn`, `status` fields to input requests
- [ ] Update frontend to filter by `status === 'active'`
- [ ] Show completed inputs with checkmarks

### Phase 2: Recalculation API
- [ ] Create `/api/stage/phases/:phaseNum/recalculate-input` endpoint
- [ ] Implement recalculation for `field_selection` (based on schema)
- [ ] Implement recalculation for `aggregation_method` (based on field types)

### Phase 3: Frontend Integration
- [ ] Add `handleInputProvided()` function
- [ ] Detect dependent inputs and trigger recalculation
- [ ] Show loading states during recalculation
- [ ] Allow editing completed inputs (resets dependents)

### Phase 4: Testing
- [ ] Test data source → field selection flow
- [ ] Test cascade: data source → fields → aggregation → visualization
- [ ] Test editing earlier input (should reset later inputs)
- [ ] Test validation (can't proceed without required inputs)

## Example Complete Flow

```
User starts orchestration
  ↓
Phase 1 pauses with input requests:
  [✓] data_source (active)
  [⏳] field_selection (pending, depends on data_source)
  [⏳] aggregation_method (pending, depends on field_selection)
  [⏳] visualization (pending, depends on aggregation_method)

User selects MongoDB: sales_db / orders
  ↓ Trigger recalculation
  [✓] data_source (completed: sales_db/orders)
  [🔄] field_selection (recalculating... analyzing schema)
  [⏳] aggregation_method (pending)
  [⏳] visualization (pending)

Schema analyzed → 15 fields found
  ↓ Show field selection
  [✓] data_source (completed: sales_db/orders)
  [✓] field_selection (active: SELECT which of 15 fields to analyze)
  [⏳] aggregation_method (pending)
  [⏳] visualization (pending)

User selects fields: total_amount, customer_id, order_date
  ↓ Trigger recalculation
  [✓] data_source (completed)
  [✓] field_selection (completed: 3 fields)
  [🔄] aggregation_method (recalculating... checking field types)
  [⏳] visualization (pending)

Field types detected: total_amount=number, customer_id=string, order_date=date
  ↓ Show aggregation options
  [✓] data_source (completed)
  [✓] field_selection (completed)
  [✓] aggregation_method (active: Choose from sum/avg/count)
  [⏳] visualization (pending)

User selects: SUM(total_amount) GROUP BY customer_id
  ↓ Trigger recalculation
  [✓] data_source (completed)
  [✓] field_selection (completed)
  [✓] aggregation_method (completed: SUM by customer)
  [🔄] visualization (recalculating... suggest chart types)

Chart types suggested based on aggregation
  ↓ Show visualization options
  [✓] data_source (completed)
  [✓] field_selection (completed)
  [✓] aggregation_method (completed)
  [✓] visualization (active: Bar chart / Pie chart / Table)

User selects: Bar chart
  ↓ ALL INPUTS COMPLETE
[Continue Orchestration] button appears
```

This creates a **guided, intelligent flow** that adapts to user inputs in real-time!
