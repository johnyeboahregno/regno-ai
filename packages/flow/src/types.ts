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
  technologies?: string[];
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
  /** Subject Matter Expert (SMA) slug — centers this job's knowledge on the SMA's focus area. */
  sma?: string;
  provider?: 'openai' | 'anthropic' | 'google' | 'deepseek';
  /** When true (default), failed provider calls fall through to the next configured provider. */
  fallback?: boolean;
  model?: string;
  targetScore?: number;
  maxPasses?: number;
  /** Recall & Serve — serve known answers from memory instead of calling the LLM. Default: enabled (env CORTEX_SERVE_ENABLED). */
  serveEnabled?: boolean;
  /** Minimum match score (0..1) to serve from memory. Default 0.86 (env CORTEX_SERVE_MIN_SCORE). */
  serveMinScore?: number;
  /** Maximum memory age (days) to serve. Default 180 (env CORTEX_SERVE_MAX_AGE_DAYS). */
  serveMaxAgeDays?: number;
  /** Whole-task short-circuit: serve the entire task from memory when confident. Default false. */
  serveWholeTask?: boolean;
}

export interface ExecutionResult {
  executionId: string;
  agentSlug: string;
  depth: AnalysisDepth;
  output: string;
  finalScore: number;
  phases: Array<{ name: string; output: string }>;
}
