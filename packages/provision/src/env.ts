/**
 * Build the `.env.prod` payload written to a target machine. Merges non-secret
 * config with decrypted secrets and the same DB defaults `deploy.sh` assumes.
 * SSH credentials (SSH_KEY / SSH_PASSWORD) are provisioner-only and excluded.
 */
const DB_DEFAULTS: Record<string, string> = {
  MONGO_URI: 'mongodb://mongo:27017/regno',
  MONGO_POOL_SIZE: '50',
  NEO4J_URI: 'bolt://neo4j:7687',
  NEO4J_USER: 'neo4j',
  QDRANT_URL: 'http://qdrant:6333',
  REDIS_URL: 'redis://redis:6379',
};

const PROVISIONER_ONLY = new Set(['SSH_KEY', 'SSH_PASSWORD', 'CF_API_TOKEN', 'CF_ZONE_ID']);

// deploy.sh does `source .env.prod` as a real shell script (to load vars for the seed step),
// so any value containing spaces/`$`/backticks/quotes must be shell-quoted — an unquoted value
// like "Regno Cloud Admin" gets parsed as a command invocation ("Cloud: command not found").
// Double-quoting also round-trips fine through docker compose's --env-file parser.
function shellQuote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`')}"`;
}

export function buildEnvPayload(
  env: Record<string, string>,
  secrets: Record<string, string>,
  slug?: string,
): string {
  const merged: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) if (v !== undefined && v !== null) merged[k] = String(v);
  for (const [k, v] of Object.entries(secrets)) {
    if (PROVISIONER_ONLY.has(k)) continue;
    if (v !== undefined && v !== null && String(v) !== '') merged[k] = String(v);
  }
  for (const [k, v] of Object.entries(DB_DEFAULTS)) if (!merged[k]) merged[k] = v;

  // Architect → Mothership telemetry wiring (see docs/engineering/31-architect-telemetry.md).
  // The Mothership reports its own public URL; each Architect needs to know who it is
  // and where to POST its Regno Standard heartbeat.
  if (slug) merged.ARCHITECT_SLUG = slug;
  if (process.env.MOTHERSHIP_URL) merged.MOTHERSHIP_URL = process.env.MOTHERSHIP_URL;

  const lines: string[] = [];
  for (const [k, v] of Object.entries(merged)) lines.push(`${k}=${shellQuote(v)}`);
  return `${lines.join('\n')}\n`;
}
