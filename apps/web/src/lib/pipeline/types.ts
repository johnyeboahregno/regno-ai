/**
 * GENESIS — visual pipeline model.
 * Mirrors the live regno.ai/pipelines node-canvas data model.
 */

export type NodeStatus = 'idle' | 'running' | 'ok' | 'error';

export interface PipelineNode {
  id: string;
  type: string; // catalog key, e.g. 'llm' | 'transform' | 'filter'
  label: string;
  x: number;
  y: number;
  config: Record<string, unknown>;
  status?: NodeStatus;
  error?: string;
  outputPreview?: string;
}

export interface PipelineEdge {
  id: string;
  from: string; // source node id
  fromPort: string; // source output port id
  to: string; // target node id
  toPort: string; // target input port id
}

export interface PipelineDoc {
  id?: string;
  name: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RunLog {
  level: 'info' | 'ok' | 'error' | 'warn';
  message: string;
  ts?: string;
  nodeId?: string;
}

export interface RunRecord {
  executionId: string;
  pipelineId?: string;
  name: string;
  status: 'running' | 'completed' | 'failed';
  nodeCount: number;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  logs: RunLog[];
}
