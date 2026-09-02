/**
 * Regno Standard — Universal Telemetry Data Standard helpers.
 *
 * See docs/regno-standard/ (OVERVIEW, DOCUMENT_HIERARCHY, CONFIGURATION_DOCUMENTS,
 * DATA_DOCUMENTS, TIMESTAMP_AND_ID, NAMING_CONVENTIONS).
 *
 * Conventions implemented here:
 *   - Timestamps are Int64 nanoseconds since the Unix epoch. JSON has no Int64,
 *     so they are serialized as decimal strings to avoid IEEE-754 precision loss.
 *   - Document ids are content-derived (SHA-256 of canonical JSON, id excluded)
 *     via `regnoId`, but we keep the recommended human-readable prefixes.
 *   - Field names are camelCase; tag keys are snake_case; sourceIds are dot-notation.
 */
import { createHash } from 'node:crypto';

/** Canonical JSON (sorted keys, recursively) for deterministic content hashing. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

/** Current time in Regno Standard nanoseconds (decimal string, Int64-safe). */
export function nowNanos(): string {
  return (BigInt(Date.now()) * 1_000_000n).toString();
}

/** Convert an epoch-milliseconds value to Regno Standard nanoseconds. */
export function toNanos(epochMs: number): string {
  return (BigInt(Math.floor(epochMs)) * 1_000_000n).toString();
}

/** Parse a Regno Standard nanosecond timestamp (string | bigint | number) into a Date. */
export function nanosToDate(nanos: string | bigint | number): Date {
  const n = typeof nanos === 'bigint' ? nanos : BigInt(nanos);
  return new Date(Number(n / 1_000_000n));
}

/** Content-based Regno Standard document id (SHA-256 of canonical JSON minus `id`). */
export function regnoId(doc: Record<string, unknown>): string {
  const { id: _id, ...rest } = doc;
  return createHash('sha256').update(stableStringify(rest)).digest('hex');
}

/** A Regno Standard document (all documents share `id` + `type`). */
export interface RegnoDocument {
  id: string;
  type: string;
  [key: string]: unknown;
}

/** Tag key/value pair used across the standard (lowercase snake_case keys). */
export interface RegnoTag {
  id: string;
  type: 'TagDoc';
  key: string;
  value: string;
}

export interface ArchitectServiceState {
  name: string; // 'mongo' | 'redis' | 'qdrant' | 'neo4j'
  online: boolean;
  detail?: string;
}

/** A point-in-time snapshot of one Architect's health, to be encoded as Regno Standard. */
export interface ArchitectTelemetryInput {
  slug: string;
  domain: string;
  developer: string;
  version: string;
  uptimeSeconds: number;
  memPercent: number;
  services: ArchitectServiceState[];
  status: 'healthy' | 'degraded' | 'error';
}

function metric(
  slug: string,
  now: string,
  idKey: string,
  sourceId: string,
  name: string,
  units: string,
  format: string,
  value: number,
): RegnoDocument[] {
  const paramDefId = `param-def-${slug}-${idKey}`;
  const paramDef: RegnoDocument = {
    id: paramDefId,
    type: 'ParamDefDoc',
    sourceId,
    name,
    description: `Architect ${slug} ${name.toLowerCase()}`,
    groups: ['Regno', 'Architect', 'Telemetry'],
    units,
    format,
    paramDefDocType: 'Scalar',
  };
  const scalar: RegnoDocument = {
    id: `scalar-${slug}-${idKey}-${now}`,
    type: 'ParamScalarValueDoc',
    configDocId: `cfg-architect-${slug}`,
    paramDefDocId: paramDefId,
    value,
    time: now,
    constant: false,
  };
  return [paramDef, scalar];
}

/**
 * Encode an Architect telemetry snapshot as a complete Regno Standard document set:
 * ConfigDoc (root) → IdentityDoc, ParamDefDoc[] + ParamScalarValueDoc[], TagDoc[],
 * and an EventDefDoc + EventDataDoc for the overall health status.
 */
export function buildArchitectTelemetryBundle(input: ArchitectTelemetryInput): {
  configDocId: string;
  docs: RegnoDocument[];
  summary: {
    status: 'healthy' | 'degraded' | 'error';
    version: string;
    uptimeSeconds: number;
    memPercent: number;
    services: ArchitectServiceState[];
  };
} {
  const now = nowNanos();
  const slug = input.slug;
  const configDocId = `cfg-architect-${slug}`;

  const tags: RegnoTag[] = [
    { id: `tag-${slug}-architect`, type: 'TagDoc', key: 'architect_slug', value: slug },
    { id: `tag-${slug}-domain`, type: 'TagDoc', key: 'domain', value: input.domain },
    { id: `tag-${slug}-version`, type: 'TagDoc', key: 'version', value: input.version },
  ];

  const identityDoc: RegnoDocument = {
    id: `id-architect-${slug}`,
    type: 'IdentityDoc',
    tags: {
      organization: 'Regno',
      department: 'Architect Fleet',
      data_owner: input.developer,
      architect_slug: slug,
      domain: input.domain,
    },
  };

  const subHeartbeat: RegnoDocument = {
    id: `sub-heartbeat-${slug}`,
    type: 'SubConfigDoc',
    name: 'Heartbeat',
    description: `Periodic heartbeat from Architect ${slug}`,
    group: 'telemetry',
    version: 1,
    state: 'Live',
    sourceType: 'Data',
    startTime: now,
    endTime: now,
  };

  const subServices: RegnoDocument = {
    id: `sub-services-${slug}`,
    type: 'SubConfigDoc',
    name: 'Services',
    description: `Service reachability for Architect ${slug}`,
    group: 'telemetry',
    version: 1,
    state: 'Live',
    sourceType: 'Data',
    startTime: now,
    endTime: now,
  };

  const configDoc: RegnoDocument = {
    id: configDocId,
    type: 'ConfigDoc',
    name: `Architect ${slug}`,
    description: `Regno Architect "${slug}" telemetry (${input.domain})`,
    source: `architect-${slug}-telemetry.json`,
    startTime: now,
    endTime: now,
    timeOffset: 0,
    state: 'Live',
    sourceType: 'Data',
    subConfigDocs: [subHeartbeat, subServices],
    identityDocIds: [identityDoc.id],
    tags,
  };

  const eventDefId = `event-def-${slug}-status`;
  const eventDef: RegnoDocument = {
    id: eventDefId,
    type: 'EventDefDoc',
    sourceId: 'ARCHITECT.System.Status',
    name: 'Architect Status',
    description: `Overall health status of Architect ${slug}`,
    group: 'Architect Health',
    priority: input.status === 'healthy' ? 'Low' : 'High',
    eventType: input.status === 'healthy' ? 'Info' : 'Alert',
  };

  const eventDoc: RegnoDocument = {
    id: `event-${slug}-status-${now}`,
    type: 'EventDataDoc',
    configDocId,
    eventDefDocId: eventDefId,
    time: now,
    status: input.status.toUpperCase(),
  };

  const docs: RegnoDocument[] = [configDoc, identityDoc, eventDef, eventDoc];

  docs.push(...metric(slug, now, 'uptime-seconds', 'ARCHITECT.System.UptimeSeconds', 'Uptime', 's', '%.0f', input.uptimeSeconds));
  docs.push(...metric(slug, now, 'mem-percent', 'ARCHITECT.System.MemPercent', 'Memory Used', '%', '%.1f', input.memPercent));

  for (const svc of input.services) {
    const safe = svc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    docs.push(...metric(slug, now, `${safe}-online`, `ARCHITECT.Service.${safe}.Online`, `${svc.name} online`, 'bool', '%.0f', svc.online ? 1 : 0));
    tags.push({
      id: `tag-${slug}-service-${safe}`,
      type: 'TagDoc',
      key: `service_${safe}`,
      value: svc.online ? (svc.detail ?? 'online') : 'offline',
    });
  }

  return {
    configDocId,
    docs,
    summary: {
      status: input.status,
      version: input.version,
      uptimeSeconds: input.uptimeSeconds,
      memPercent: input.memPercent,
      services: input.services,
    },
  };
}
