# /stage Interactive Clarifications System

**Date**: November 22, 2025
**Status**: ✅ Backend Complete, UI Integration Pending
**Session Summary**: Implemented intelligent question generation for project clarification

---

## 🎯 Overview

The Interactive Clarifications System enhances `/stage` project generation by asking users targeted questions **before** creating the pipeline, ensuring MAESTRO has complete, accurate information to generate production-ready FLUX pipelines.

### Problem Solved

**Before:**
- User: "Analyze MongoDB customer data"
- MAESTRO: *Makes assumptions* about database, collection, metrics
- Result: Pipeline may not match user's actual needs

**After:**
- User: "Analyze MongoDB customer data"
- MAESTRO: *Asks clarifying questions*:
  - Which MongoDB database and collection?
  - What metrics define customer segments?
  - How should results be presented?
- User: *Provides specific answers*
- Result: Pipeline precisely matches requirements

---

## 🏗️ Architecture

### Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│ 1. User submits goal                                         │
│    "Analyze MongoDB customer data for segmentation"          │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. POST /api/stage/generate-clarifications                   │
│    • Runs MAESTRO analysis                                   │
│    • Identifies missing information                          │
│    • Generates 3-7 targeted questions                        │
│    • Creates project with status: "awaiting_clarification"   │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. Show ClarificationPanel UI                                │
│    • Display questions categorized by type                   │
│    • Capture user answers (text, select, multiselect)        │
│    • Validate required fields                                │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. POST /api/stage/projects/[id]/clarifications              │
│    • Submit answers                                          │
│    • Update project with answers                             │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. POST /api/stage/projects/[id]/resume-generation           │
│    • Format answers for LLM context                          │
│    • Generate complete FLUX pipeline                         │
│    • Project status: "draft" (ready for confirmation)        │
└──────────────────────────────────────────────────────────────┘
```

---

## 📦 Components Created

### 1. Backend Components

#### **ClarificationGenerator.ts** (`src/lib/server/stage/`)

Generates intelligent questions using LLM based on MAESTRO analysis.

**Key Methods:**
- `generateQuestions()` - Creates 3-7 questions tailored to the goal
- `formatAnswersForLLM()` - Converts answers to structured context

**Question Types:**
```typescript
type QuestionType = 'text' | 'select' | 'multiselect' | 'number';
```

**Question Categories:**
- `data-source` - Database, collection, API details
- `metrics` - Business logic, thresholds, criteria
- `requirements` - Data quality, performance constraints
- `output` - Presentation format, audience

**Example Questions Generated:**
```json
{
  "reason": "Need specific database details and segmentation criteria",
  "questions": [
    {
      "id": "q1_datasource",
      "type": "select",
      "question": "Which data source contains your customer data?",
      "options": ["MongoDB", "PostgreSQL", "REST API"],
      "required": true,
      "category": "data-source"
    },
    {
      "id": "q2_collection",
      "type": "text",
      "question": "What is the MongoDB collection name?",
      "placeholder": "e.g., customers",
      "required": true,
      "category": "data-source"
    },
    {
      "id": "q3_metrics",
      "type": "multiselect",
      "question": "Which metrics should define customer segments?",
      "options": ["Purchase frequency", "Total spend", "Recency", "Product category"],
      "required": false,
      "category": "metrics"
    }
  ]
}
```

---

#### **ClarificationPanel.svelte** (`src/lib/components/stage/`)

Svelte 5 component for displaying questions and capturing answers.

**Features:**
- Auto-validates required questions
- Conditional questions (e.g., "Collection name" only if "MongoDB" selected)
- Color-coded category badges
- Real-time answer validation
- Accessible form inputs

**Props:**
```typescript
{
  projectId: string;
  questions: ClarificationQuestion[];
  reason: string;
  onSubmit: (answers: ClarificationAnswers) => Promise<void>;
}
```

**Visual Design:**
```
┌────────────────────────────────────────────┐
│ 📋 Clarification Needed       3 required   │
│                                            │
│ Need specific database details and        │
│ segmentation criteria                      │
├────────────────────────────────────────────┤
│                                            │
│ Which data source? *        [DATA-SOURCE] │
│ ┌─────────────────────────────────────┐   │
│ │ -- Select --                        │   │
│ │ MongoDB                             │   │
│ │ PostgreSQL                          │   │
│ └─────────────────────────────────────┘   │
│                                            │
│ MongoDB collection name? *  [DATA-SOURCE] │
│ ┌─────────────────────────────────────┐   │
│ │ e.g., customers                     │   │
│ └─────────────────────────────────────┘   │
│                                            │
│ Segmentation metrics?         [METRICS]   │
│ ┌──────────────┬──────────────┬─────────┐ │
│ │ Purchase ✓   │ Total spend  │ Recency │ │
│ └──────────────┴──────────────┴─────────┘ │
│                                            │
├────────────────────────────────────────────┤
│ All required questions answered ✓          │
│                         [Continue Generation]│
└────────────────────────────────────────────┘
```

---

### 2. API Endpoints

#### **POST /api/stage/generate-clarifications**

Generates clarification questions for a user goal.

**Request:**
```json
{
  "goal": "Analyze MongoDB customer data for segmentation"
}
```

**Response:**
```json
{
  "success": true,
  "projectId": "proj_pending_1732280400000",
  "clarifications": {
    "questions": [...],
    "reason": "Need specific database details..."
  },
  "maestroAnalysis": {
    "complexity": "medium",
    "estimatedSteps": 6,
    "requiresPipeline": true,
    "dataSources": ["MongoDB"],
    "insights": "..."
  }
}
```

---

#### **GET /api/stage/projects/[id]/clarifications**

Retrieve clarification questions for a project.

**Response:**
```json
{
  "success": true,
  "clarifications": {
    "questions": [...],
    "reason": "...",
    "answers": {...},
    "status": "pending" | "completed"
  }
}
```

---

#### **POST /api/stage/projects/[id]/clarifications**

Submit clarification answers.

**Request:**
```json
{
  "answers": {
    "q1_datasource": "MongoDB",
    "q2_collection": "customers",
    "q3_metrics": ["Purchase frequency", "Total spend"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Answers submitted successfully. Resuming generation..."
}
```

---

#### **POST /api/stage/projects/[id]/resume-generation**

Resume project generation with clarification answers.

**Response:**
```json
{
  "success": true,
  "project": {
    "id": "proj_pending_1732280400000",
    "name": "Customer Segmentation Pipeline",
    "phases": [...],
    "validation": {...}
  }
}
```

---

## 📊 Database Schema

### `staged_projects` Collection

New fields added to support clarifications:

```javascript
{
  id: "proj_pending_1732280400000",
  status: "awaiting_clarification", // NEW status

  clarifications: { // NEW field
    questions: [
      {
        id: "q1",
        type: "select",
        question: "Which data source?",
        options: ["MongoDB", "PostgreSQL"],
        required: true,
        category: "data-source"
      }
    ],
    answers: {
      q1: "MongoDB",
      q2: "customers"
    },
    reason: "Need specific database details",
    status: "pending" | "completed",
    completedAt: ISODate("2025-11-22T13:00:00Z")
  },

  llmCredentialId: "cred_xxx", // Store for resumption
  model: "gpt-4",

  // ... existing fields
}
```

---

## 🔄 Project Status Flow

```
User submits goal
       ↓
[awaiting_clarification]  ← Project created, questions generated
       ↓
User answers questions
       ↓
[generating]              ← Resume generation with answers
       ↓
Generation complete
       ↓
[draft]                   ← Ready for confirmation
       ↓
User confirms
       ↓
[confirmed]               ← Ready for MAESTRO orchestration
```

---

## 🎨 UI Integration (Pending)

### Integration into `/stage` Page

The clarification panel needs to be integrated into `src/routes/stage/+page.svelte`:

**Location:** Between "Generate Project" button and orchestration display

**Conditional Display:**
```svelte
{#if selectedProject?.status === 'awaiting_clarification'}
  <ClarificationPanel
    projectId={selectedProject.id}
    questions={selectedProject.clarifications.questions}
    reason={selectedProject.clarifications.reason}
    onSubmit={handleClarificationSubmit}
  />
{/if}
```

**Handler Function:**
```typescript
async function handleClarificationSubmit(answers: ClarificationAnswers) {
  // 1. Submit answers
  await fetch(`/api/stage/projects/${selectedProject.id}/clarifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers })
  });

  // 2. Resume generation
  const response = await fetch(`/api/stage/projects/${selectedProject.id}/resume-generation`, {
    method: 'POST'
  });

  const result = await response.json();

  if (result.success) {
    // 3. Reload project list and select the updated project
    await loadStagedProjects();
    selectProject(result.project.id);
  }
}
```

---

## ✅ Completed Work

### Backend (100% Complete)

- [x] **ClarificationGenerator.ts** - LLM-based question generation
- [x] **ClarificationPanel.svelte** - Reusable UI component
- [x] **API: POST /api/stage/generate-clarifications** - Generate questions
- [x] **API: GET /api/stage/projects/[id]/clarifications** - Fetch questions
- [x] **API: POST /api/stage/projects/[id]/clarifications** - Submit answers
- [x] **API: POST /api/stage/projects/[id]/resume-generation** - Resume generation
- [x] **Build verification** - All components compile successfully

### Frontend (Pending)

- [ ] Integrate ClarificationPanel into `/stage` page
- [ ] Update "Generate Project" flow to call generate-clarifications first
- [ ] Add clarification submission handler
- [ ] Update project status badges to show "Awaiting Clarification"
- [ ] Add visual indicators for clarification state

---

## 🚀 Next Steps

### 1. Frontend Integration

**File:** `src/routes/stage/+page.svelte`

**Changes needed:**
1. Import ClarificationPanel component
2. Modify `generateProject()` to call `/generate-clarifications` instead of `/generate-project`
3. Add conditional rendering for clarification panel
4. Implement `handleClarificationSubmit()` function
5. Update status badge logic to include "awaiting_clarification"

### 2. User Flow Testing

Once integrated, test the complete flow:
1. Submit vague goal: "analyze customer data"
2. Verify questions appear
3. Answer questions
4. Verify generation resumes with enhanced context
5. Confirm pipeline matches user intent

### 3. Question Quality Improvement

Monitor generated questions and refine prompts in `ClarificationGenerator.ts` to ensure:
- Questions are specific and actionable
- Default questions cover common scenarios
- Question dependencies work correctly
- All data source types are supported

---

## 📝 Example User Experience

### Without Clarifications (Old Flow):
```
User: "Analyze MongoDB customer data"
  ↓
System: Generates generic pipeline (assumes database name, collection, metrics)
  ↓
User: "This isn't what I wanted, it's using the wrong collection!"
```

### With Clarifications (New Flow):
```
User: "Analyze MongoDB customer data"
  ↓
System: "I need more details to create the perfect pipeline:
  • Which MongoDB database and collection?
  • What metrics define good vs bad customers?
  • How should I present the results?"
  ↓
User: [Answers questions]
  ↓
System: Generates precise pipeline using "prod_db.customers" collection,
        segments by purchase_frequency and total_spend,
        outputs interactive dashboard
  ↓
User: "Perfect! Exactly what I needed."
```

---

## 🔧 Technical Highlights

### Intelligent Question Generation

The `ClarificationGenerator` uses a specialized LLM prompt that:
- Analyzes MAESTRO's initial understanding
- Identifies ambiguous or missing information
- Categorizes gaps (data source, metrics, requirements, output)
- Generates 3-7 focused questions
- Provides sensible defaults if LLM fails

### Type-Safe Implementation

All TypeScript interfaces are fully typed:
```typescript
interface ClarificationQuestion {
  id: string;
  type: QuestionType;
  question: string;
  placeholder?: string;
  options?: string[];
  required: boolean;
  dependsOn?: { [questionId: string]: string };
  category: 'data-source' | 'metrics' | 'requirements' | 'output';
}
```

### Svelte 5 Reactivity

ClarificationPanel uses modern Svelte 5 runes:
```typescript
let answers = $state<ClarificationAnswers>({});
let canSubmit = $derived(
  questions.filter(q => q.required).every(q => answers[q.id])
);
```

---

## 📚 Related Documentation

- **MAESTRO Architecture**: `docs/MAESTRO_NODE_ARCHITECTURE.md`
- **Stage Architecture**: `docs/STAGE_MAESTRO_ARCHITECTURE.md`
- **Project Generation**: `src/lib/server/stage/ProjectGenerator.ts`
- **FLUX Pipeline Architecture**: `docs/STAGE_FLUX_PIPELINE_ARCHITECTURE.md`

---

## 🎯 Success Metrics

Once fully integrated, success can be measured by:
- **Accuracy**: % of generated pipelines that match user intent on first try
- **Completion Rate**: % of users who answer clarifications vs abandon
- **Question Quality**: Average relevance rating of generated questions
- **Time Savings**: Reduction in manual pipeline edits after generation

---

**Session Complete** ✅

**Backend Implementation:** 100% Complete
**Frontend Integration:** Ready for implementation
**Build Status:** ✓ Passing
**Documentation:** Complete
