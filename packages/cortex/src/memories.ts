/**
 * CORTEX memories / wisdom — the compounding loop from docs/cortex-flow-design.md §2.4.
 * Every execution writes insights → AgentMemoryService → cortex_agent_memories (Mongo) + cortex_wisdom (Qdrant).
 */
import { writeWisdom } from '@regno/db';
import { embed } from '@regno/ai';

export interface Memory {
  id: string;
  agentSlug: string;
  category: string;
  content: string;
  contexts?: string[];
  developer?: string;
  /** Original task prompt — stored so the Recall & Serve layer can match future prompts. */
  prompt?: string;
  /** Short sha-256 of the prompt — used for dedupe + reinforcement. */
  promptHash?: string;
  /** Execution phase that produced this memory (e.g. 'whole' | 'understand' | 'implement'). */
  phase?: string;
  /** Quality score of the execution that produced this memory. */
  score?: number;
}

export function remember(memory: Memory): Promise<{ id: string }> {
  return writeWisdom(memory, embed);
}
