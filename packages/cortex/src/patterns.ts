/**
 * CORTEX patterns — create/update patterns across all three stores
 * (Mongo → Qdrant → Neo4j), via @regno/db three-store sync.
 */
import { writePattern } from '@regno/db';
import { embed } from '@regno/ai';

export interface Pattern {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  confidence?: number;
  source?: string;
  [key: string]: unknown;
}

export function createPattern(pattern: Pattern): Promise<{ id: string }> {
  return writePattern(pattern, embed);
}
