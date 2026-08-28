/** Core Cortex Flow types — mirrors docs/cortex-flow-design.md §1. */

export type AnalysisDepth = 'quick' | 'standard' | 'deep';

export interface AgentPhase {
  name: string;
  needs?: string[];
  depths?: AnalysisDepth[];
  prompt?: string;
}

export interface AgentDef {
  slug: string;
  name: string;
  triggers?: string[];
  capabilities?: { tools?: string[] };
  planTemplate?: { depthStrategy?: 'auto' | 'fixed'; phases?: AgentPhase[] };
  costCeilingUsd?: number;
  maxTokens?: number;
  version?: number;
}

export interface PlanPhase {
  name: string;
  needs: string[];
  prompt: string;
}

export interface ExecutionPlan {
  agentSlug: string;
  depth: AnalysisDepth;
  phases: PlanPhase[];
}

export interface ExecutionSettings {
  analysisDepth?: AnalysisDepth;
  forceAgent?: string;
  developer?: string;
  provider?: 'openai' | 'anthropic' | 'google';
  model?: string;
  targetScore?: number;
  maxPasses?: number;
}

export interface ExecutionResult {
  executionId: string;
  agentSlug: string;
  depth: AnalysisDepth;
  output: string;
  finalScore: number;
  phases: Array<{ name: string; output: string }>;
}
