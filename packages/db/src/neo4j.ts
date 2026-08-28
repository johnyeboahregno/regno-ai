/**
 * Neo4j graph client (knowledge graph, pattern relationships, audit lineage).
 * Mirrors the docs' generic neo4jService.run(cypher, params) primitive.
 */
import neo4j, { Driver, Session } from 'neo4j-driver';

let driver: Driver | null = null;

export function getNeo4j(): Driver {
  if (!driver) {
    const uri = process.env.NEO4J_URI ?? 'bolt://localhost:7687';
    const user = process.env.NEO4J_USER ?? 'neo4j';
    const pass = process.env.NEO4J_PASSWORD ?? '';
    driver = neo4j.driver(uri, neo4j.auth.basic(user, pass));
  }
  return driver;
}

/** Run an arbitrary Cypher query with params. */
export async function run(
  cypher: string,
  params: Record<string, unknown> = {},
): Promise<unknown> {
  const session: Session = getNeo4j().session();
  try {
    const result = await session.run(cypher, params);
    return result.records.map((r) => r.toObject());
  } finally {
    await session.close();
  }
}

export async function closeNeo4j(): Promise<void> {
  await driver?.close();
  driver = null;
}
