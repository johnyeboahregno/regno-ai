# Quality Auditor

## Overview

The Quality Auditor is a validation and quality control meta-agent that validates outputs, checks for quality issues, and provides actionable feedback. It can run automatic checks after each phase or perform comprehensive audits on final outputs.

## Location

```
src/lib/server/cortex-flow/agents/QualityAuditor.ts
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          QUALITY AUDITOR                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    COMPLETENESS CHECKS                                │   │
│  │  • Output length validation                                           │   │
│  │  • Prompt requirements coverage                                       │   │
│  │  • Key term presence                                                  │   │
│  │  • Refusal pattern detection                                          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    FORMATTING CHECKS                                  │   │
│  │  • JSON validation and schema checking                                │   │
│  │  • Markdown structure validation                                      │   │
│  │  • Code block detection                                               │   │
│  │  • Whitespace normalization                                           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    COHERENCE CHECKS                                   │   │
│  │  • Contradiction detection                                            │   │
│  │  • Incomplete sentence detection                                      │   │
│  │  • Logical flow analysis                                              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    SAFETY CHECKS                                      │   │
│  │  • Sensitive data detection (passwords, API keys)                     │   │
│  │  • PII detection (email addresses)                                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    ACCURACY CHECKS                                    │   │
│  │  • Uncertainty language detection                                     │   │
│  │  • Unsourced claims detection                                         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Quality Issue Types

### Severity Levels

| Level | Description | Impact on Score |
|-------|-------------|-----------------|
| `critical` | Serious issues that may make output unusable | -25 points |
| `warning` | Notable issues that should be addressed | -10 points |
| `suggestion` | Minor improvements that could enhance quality | -3 points |

### Issue Categories

| Category | Description |
|----------|-------------|
| `completeness` | Output doesn't fully address the prompt |
| `accuracy` | Potential factual issues or unverified claims |
| `formatting` | Structure, syntax, or format problems |
| `coherence` | Logical flow or consistency issues |
| `safety` | Potentially sensitive information detected |
| `performance` | Efficiency or optimization concerns |
| `style` | Writing style or presentation issues |

## Main API

### audit()

Comprehensive quality audit on output.

```typescript
const result = await qualityAuditor.audit(output, {
  prompt: 'Research Tesla Q4 earnings',
  expectedType: 'markdown',
  phaseName: 'Research',
  phaseIndex: 0,
  isLastPhase: false,
  threshold: 70,
  checks: {
    completeness: true,
    accuracy: true,
    formatting: true,
    coherence: true,
    safety: true
  },
  autoCorrect: false,
  maxIssues: 10
});
```

**Returns:**
```typescript
interface QualityAuditResult {
  auditId: string;
  timestamp: Date;
  score: number;              // 0-100
  passed: boolean;            // score >= threshold
  issues: QualityIssue[];
  stats: {
    criticalCount: number;
    warningCount: number;
    suggestionCount: number;
    checksPerformed: number;
  };
  recommendations: string[];
  correctedOutput?: string;   // If autoCorrect was enabled
  duration: number;           // Audit duration in ms
}
```

### quickValidate()

Lightweight validation for per-phase checks.

```typescript
const result = qualityAuditor.quickValidate(output, {
  prompt: 'Extract data from PDF',
  expectedType: 'json'
});

// Returns: { valid: boolean, issues: QualityIssue[], score: number }
```

### validateJson()

Validate JSON output with optional schema.

```typescript
const result = qualityAuditor.validateJson(output, {
  required: ['title', 'summary'],
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    items: { type: 'array' }
  }
});
```

### validateMarkdown()

Validate markdown structure.

```typescript
const result = qualityAuditor.validateMarkdown(output);

// Checks for:
// - Headers in long content
// - Unclosed code blocks
// - Empty links
```

## Orchestrator Integration

The Quality Auditor can be enabled in the Orchestrator:

```typescript
const orchestrator = new Orchestrator(plan, settings, userId, {
  enableQualityAudit: true,   // Enable quality checks
  qualityThreshold: 70        // Score threshold (0-100)
});
```

### Events

When quality audit is enabled, the Orchestrator emits additional events:

**Per-phase quality:**
```typescript
orchestrator.on('phase_quality', (event) => {
  // event.type: 'v2_phase_quality'
  // event.phaseIndex: number
  // event.phaseName: string
  // event.score: number
  // event.passed: boolean
  // event.issueCount: number
  // event.recommendations: string[]
});
```

**Final quality (in orchestration_complete):**
```typescript
orchestrator.on('orchestration_complete', (event) => {
  // event.quality: {
  //   score: number,
  //   passed: boolean,
  //   issues: { criticalCount, warningCount, suggestionCount },
  //   recommendations: string[]
  // }
});
```

## Auto-Correction

Some issues can be automatically corrected:

| Issue | Auto-Fix |
|-------|----------|
| Unclosed code blocks | Add closing ``` |
| Excessive blank lines | Reduce to max 2 |
| Trailing whitespace | Trim line ends |

Enable with:
```typescript
const result = await qualityAuditor.audit(output, {
  ...options,
  autoCorrect: true
});

if (result.correctedOutput) {
  // Use corrected version
}
```

## Quality Checks Detail

### Completeness

- **Output length**: Minimum 50 characters for non-JSON output
- **Refusal detection**: Patterns like "I cannot", "I'm unable to"
- **Key term coverage**: Checks if prompt keywords appear in output

### Formatting

- **JSON**: Parse validation, schema compliance
- **Markdown**: Headers, code blocks, link integrity
- **Code**: Code block presence and closure
- **Whitespace**: Excessive blank lines, trailing whitespace

### Coherence

- **Contradictions**: Detects conflicting statements
- **Completeness**: Checks for truncated/incomplete output

### Safety

- **Credentials**: Detects password/API key patterns
- **PII**: Detects email addresses

### Accuracy

- **Uncertainty**: Detects hedging language
- **Sources**: Flags unsourced date/number claims

## Usage Examples

### Basic Audit

```typescript
import { qualityAuditor } from '$lib/server/cortex-flow/agents';

const output = '# Research Report\n\nTesla Q4 revenue was $25.17B...';
const result = await qualityAuditor.audit(output, {
  prompt: 'Research Tesla Q4 earnings and write a summary',
  expectedType: 'markdown',
  threshold: 70
});

console.log(`Score: ${result.score}/100`);
console.log(`Passed: ${result.passed}`);
console.log(`Issues: ${result.issues.length}`);
```

### JSON Validation

```typescript
const jsonOutput = '```json\n{"title": "Report", "items": []}\n```';
const result = qualityAuditor.validateJson(jsonOutput, {
  required: ['title', 'summary'],
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' }
  }
});

if (!result.valid) {
  console.log('JSON issues:', result.issues);
}
```

### Phase-Level Quick Check

```typescript
const quickResult = qualityAuditor.quickValidate(phaseOutput, {
  prompt: phasePrompt,
  expectedType: 'text'
});

if (!quickResult.valid) {
  console.warn('Phase output has critical issues');
}
```

## Activation

### Status: Implemented and ON by default

The Quality Auditor is **enabled by default** in the Orchestrator.

```typescript
const orchestrator = new Orchestrator(plan, settings, userId, {
  enableQualityAudit: true,    // Enable quality auditing (default: true)
  qualityThreshold: 70         // Minimum score to pass (default: 70)
});
```

### To Disable

```typescript
const orchestrator = new Orchestrator(plan, settings, userId, {
  enableQualityAudit: false    // Disable quality auditing
});
```

### Direct Usage (Always Available)

For standalone use without the Orchestrator:

```typescript
import { qualityAuditor } from '$lib/server/cortex-flow/agents';

// No activation needed - use directly
const result = await qualityAuditor.audit(output, options);
```

## Related Documentation

- [Agent OS Architecture](./AGENT_OS_ARCHITECTURE.md) - Overall architecture
- [Context Curator](./CONTEXT_CURATOR.md) - Memory & Learning meta-agent
