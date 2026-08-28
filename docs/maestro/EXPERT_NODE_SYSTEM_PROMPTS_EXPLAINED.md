# Expert Node System Prompts: How They Work Together

## Overview

The Expert Node uses a **dual-system prompt architecture** to satisfy user requirements while maintaining sophisticated internal reasoning capabilities. This document explains how these system prompts relate and flow through the execution process.

---

## The Two Types of System Prompts

### 1. **User-Defined System Prompt** (External/User-Facing)
- **Where It's Defined:** In the Expert Node configuration (can be saved in System Prompts Library)
- **Purpose:** Defines the **personality, role, and behavior** of the AI assistant
- **Scope:** Controls how the AI responds to the user's question
- **Access:** `nodeConfig.systemPrompt` or `nodeConfig.systemPrompts.reasoning`

**Example:**
```
You are a financial analyst specializing in cryptocurrency markets.
Provide detailed, data-driven insights with a focus on risk analysis.
Always cite your sources and be conservative in your predictions.
```

### 2. **Internal System Prompts** (Workflow/Planning)
- **Where They're Defined:** Hardcoded in `expertWorkflow.ts` and `ExpertNodeImpl.ts`
- **Purpose:** Guide the **internal reasoning workflow** (8 steps)
- **Scope:** Controls how the AI plans, gathers information, and structures its approach
- **Not Visible:** To the end user directly

**Internal Prompts for Each Stage:**
```typescript
systemPrompts: {
  ambiguityCheck: 'You are an expert at identifying ambiguous or unclear user questions...',
  taskClassification: 'Classify this task as one of: factual, how-to, creative...',
  toolPlanning: 'Determine what tools or data sources are needed...',
  reasoning: '[User's system prompt is used here]'
}
```

---

## The 8-Step Workflow and Prompt Flow

Here's how the Expert Node executes a request, showing where each prompt is used:

### **Step 1: Parse & Extract Intent** ⚙️
- **System Prompt Used:** None (deterministic code)
- **What It Does:** Extracts task type, entities, constraints from the question
- **Example:** Question "What's Bitcoin's price?" → Task: factual, Entities: [Bitcoin, price]

### **Step 2: Ambiguity Check** ⚙️
- **System Prompt Used:** `systemPrompts.ambiguityCheck` (internal)
- **What It Does:** Determines if the question needs clarification
- **Example:** "How do I invest?" might be ambiguous and trigger clarifying questions

### **Step 3: Task Classification** ⚙️
- **System Prompt Used:** `systemPrompts.taskClassification` (internal)
- **What It Does:** Classifies as factual, how-to, creative, analytical, or conversational
- **Example:** "Explain quantum computing" → Classification: factual + analytical

### **Step 4: Tool Planning** ⚙️
- **System Prompt Used:** `systemPrompts.toolPlanning` (internal)
- **What It Does:** Decides which tools to use (web_search, calculator, code_execution, etc.)
- **Example:** "What's the weather in Tokyo?" → Tools needed: [web_search]

### **Step 5: Gather Information** ⚙️
- **System Prompt Used:** None (executes tools directly)
- **What It Does:** Runs the planned tools and collects results
- **Example:** Executes web search, gets results with snippets and content

### **Step 6: Reasoning & Synthesis** 👤 **← USER'S SYSTEM PROMPT USED HERE**
- **System Prompt Used:** `nodeConfig.systemPrompt` (user-defined)
- **What It Does:** Generates the final answer using the user's personality/role
- **This Is The Critical Step:** Where the user's system prompt takes over

**The Reasoning Prompt Structure:**
```typescript
const reasoningPrompt = `${systemPrompt}  // ← USER'S SYSTEM PROMPT

You are answering the following question:
"${question}"
${conversationContextText}  // Previous Q&A if follow-up

Task Type: ${taskClass}
Context: ${contextParts.join(', ')}${contextData}

${toolInstructions}  // What tools found
${toolStatusNote}    // Any failures

Please provide a comprehensive, well-reasoned answer that:
1. FIRST - Check for Follow-up Context
2. Check Tool Results
3. For web search results: [detailed instructions]
4. For Follow-up Requests: [detailed instructions]
5. For Visualization/Chart Requests: [code generation instructions]
6. General Guidelines: [quality standards]

Answer:`;
```

### **Step 7: Safety Checks** ⚙️
- **System Prompt Used:** None (policy-based validation)
- **What It Does:** Validates the answer against safety policies
- **Example:** Checks for harmful content, PII, policy violations

### **Step 8: Verification** ⚙️
- **System Prompt Used:** None (consistency checks)
- **What It Does:** Verifies response quality and completeness
- **Example:** Checks answer length, coherence, relevance

---

## How The Two Prompts Work Together

### Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│  USER ASKS A QUESTION                                    │
│  "What are the top cryptocurrencies by market cap?"     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  STEPS 1-5: PLANNING & GATHERING (Internal Prompts)     │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Step 1: Parse → "factual query, entities: [...]" │   │
│  │ Step 2: Ambiguity → "clear, no clarification"    │   │
│  │ Step 3: Classify → "factual + data-driven"       │   │
│  │ Step 4: Tools → "web_search needed"              │   │
│  │ Step 5: Gather → [executes web search]           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  Result: Collected data, tool results, context          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  STEP 6: ANSWER GENERATION (User's System Prompt)       │
│  ┌─────────────────────────────────────────────────┐   │
│  │ USER'S PROMPT:                                    │   │
│  │ "You are a financial analyst specializing in      │   │
│  │  cryptocurrency markets..."                       │   │
│  │                                                    │   │
│  │ COMBINED WITH:                                    │   │
│  │ - The question                                    │   │
│  │ - Tool results (search data)                      │   │
│  │ - Conversation context                            │   │
│  │ - Detailed answer guidelines                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  Result: Answer in user's specified style/role          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  STEPS 7-8: VALIDATION (No prompts, policy checks)      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Step 7: Safety → Pass                             │   │
│  │ Step 8: Verify → Pass                             │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  FINAL ANSWER DELIVERED TO USER                          │
│  "Here are the top 10 cryptocurrencies by market cap... │
│   [Answer in the style defined by user's system prompt]"│
└─────────────────────────────────────────────────────────┘
```

---

## Key Principles

### 1. **Separation of Concerns**
- **Internal Prompts:** Handle the "how" (workflow, planning, tool selection)
- **User Prompt:** Handles the "what" (personality, style, expertise)

### 2. **The User's Prompt Is The Final Voice**
The user's system prompt is **only used in Step 6 (Reasoning & Synthesis)**, which means:
- All planning happens with intelligent defaults
- The final answer reflects the user's specified role/personality
- The user doesn't need to worry about tool planning or workflow management

### 3. **Enhanced Instructions Layer**
The reasoning prompt adds a comprehensive instructions layer **on top of** the user's system prompt:
```typescript
`${userSystemPrompt}

You are answering: "${question}"
[context, tool results, conversation history]

Please provide an answer that:
1. Checks for follow-up context
2. Uses tool results effectively
3. Provides code for visualizations
4. Cites sources properly
5. [... 10+ detailed guidelines ...]

Answer:`
```

This ensures **quality standards** are maintained while respecting the **user's personality/role definition**.

---

## Practical Example

### User Configuration
```javascript
{
  systemPrompt: "You are a senior data scientist. Explain concepts clearly with examples and always suggest Python code when relevant.",
  model: "claude-3-opus",
  temperature: 0.7
}
```

### User Question
```
"What's the correlation between Bitcoin and Ethereum prices?"
```

### Internal Execution Flow

**Steps 1-5 (Internal Prompts):**
```
[1] Parse: entities=[Bitcoin, Ethereum, correlation, prices]
[2] Ambiguity: PASS (clear question)
[3] Classify: analytical + data-driven
[4] Tools: web_search (for current prices/data)
[5] Gather: [fetches web search results with price data]
```

**Step 6 (User's System Prompt):**
```
System Prompt: "You are a senior data scientist. Explain concepts clearly..."

You are answering: "What's the correlation between Bitcoin and Ethereum prices?"

Tool Results:
- web_search: Found 5 results about BTC/ETH correlation
  * Snippet 1: "Bitcoin and Ethereum have shown a correlation of 0.85..."
  * Snippet 2: "Historical data shows strong positive correlation..."

Please provide an answer that:
[... detailed guidelines including code generation ...]

Answer:
```

**Generated Answer (in user's style):**
```
As a data scientist, I can tell you that Bitcoin and Ethereum typically show
a strong positive correlation of around 0.85, meaning they move together about
85% of the time.

Here's Python code to calculate this correlation yourself:

```python
import pandas as pd
import yfinance as yf

# Fetch historical data
btc = yf.download('BTC-USD', start='2023-01-01')['Close']
eth = yf.download('ETH-USD', start='2023-01-01')['Close']

# Calculate correlation
correlation = btc.corr(eth)
print(f"BTC-ETH Correlation: {correlation:.2f}")
```

This correlation exists because both cryptocurrencies are influenced by similar
market factors: investor sentiment, regulatory news, and overall crypto market health.

**Sources:**
[1] CoinDesk - Bitcoin Ethereum Correlation Analysis - https://...
```

---

## Configuration Options

### Where to Set the User's System Prompt

**Option 1: Direct Node Configuration**
```javascript
expertNode.config.systemPrompt = "You are a financial analyst...";
```

**Option 2: System Prompts Library** (Recommended)
1. Navigate to System Prompts Library in UI
2. Create/save prompt: "Financial Analyst"
3. Select it in Expert Node configuration
4. The node uses: `nodeConfig.systemPrompt` at runtime

### Default Fallback
If no user prompt is provided:
```typescript
const systemPrompt = nodeConfig.systemPrompt ||
                     nodeConfig.systemPrompts?.reasoning ||
                     'You are a helpful expert.';
```

---

## Advanced Features

### 1. **Conversation Context Integration**
The system automatically adds conversation history:
```
**CONVERSATION CONTEXT:**
Previous Question: "What are the top 10 economies?"
Current Question: "chart this"

**⚠️ Follow-up Action Detected:**
This is a continuation - use data from previous answer to generate chart code.
```

### 2. **Tool-Specific Instructions**
When web search is used, additional instructions are injected:
```
**IMPORTANT - Tool Results Available:**
- Web Search: Found 5 results with enriched content
  * Extract information from SNIPPETS and fullContent
  * Use inline citations [1], [2], [3]
  * Add a Sources section at the end
```

### 3. **Visualization Code Generation**
When charting is requested:
```
5. **For Visualization/Chart Requests:**
   - Provide executable Python code using matplotlib/plotly
   - Extract data from previous answer
   - Include complete, runnable code with imports
```

---

## Summary

### How It Satisfies Requirements

✅ **User Control:** User defines personality, role, expertise via their system prompt

✅ **Intelligent Execution:** Internal prompts handle workflow, planning, tool selection automatically

✅ **Quality Standards:** Enhanced instructions layer ensures citations, code generation, context awareness

✅ **Flexibility:** User's prompt can be simple ("Be friendly") or complex ("You are a PhD economist specializing in...")

✅ **Library Integration:** System prompts can be saved and reused across nodes

### The Key Insight

The Expert Node **separates intelligence (internal) from personality (user-defined)**:
- **Intelligence:** How to gather information, which tools to use, how to structure reasoning
- **Personality:** How to present that information to the user

This allows users to focus on **what they want the AI to be** without worrying about **how it should think**.

---

## File References

- **Workflow Implementation:** `src/lib/server/execution/expertWorkflow.ts`
- **Node Configuration:** `src/lib/nodes/ExpertNodeImpl.ts`
- **User Prompt Access:** Line 301 in `expertWorkflow.ts`
- **Reasoning Prompt Assembly:** Lines 376-455 in `expertWorkflow.ts`

---

**Document Version:** 1.0
**Last Updated:** 2025-10-20
**Author:** System Documentation (Generated via Claude Code)
