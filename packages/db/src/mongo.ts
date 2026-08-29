/**
 * MongoDB client — centralized, pooled, capped, idle-evicted.
 * Mirrors the REGNO-MONGO-CONN-MANAGER pattern from the docs
 * (root cause of the live 2000-connection exhaustion was a single
 * unbounded client — this one is capped + pooled).
 */
import { MongoClient, Db } from 'mongodb';
import { DB_NAME } from '@regno/shared';

export { ObjectId } from 'mongodb';

let client: MongoClient | null = null;

export function getMongoClient(): MongoClient {
  if (!client) {
    const uri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/regno';
    client = new MongoClient(uri, {
      maxPoolSize: Number(process.env.MONGO_POOL_SIZE ?? 50),
      minPoolSize: 5,
      maxIdleTimeMS: 60_000,
      serverSelectionTimeoutMS: 10_000,
    });
  }
  return client;
}

/** Returns a connected Db (defaults to the Regno DB name). */
export async function getDb(name: string = DB_NAME): Promise<Db> {
  const c = getMongoClient();
  // connect() is idempotent in the v6 driver — safe to call when already connected.
  await c.connect();
  return c.db(name);
}

export async function closeMongo(): Promise<void> {
  await client?.close();
  client = null;
}
