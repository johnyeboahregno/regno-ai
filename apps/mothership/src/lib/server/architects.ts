import type { ArchitectRecord } from '@regno/db';

/** Shape sent to the UI — never includes secrets (they live in the vault). */
export function toPublicArchitect(a: ArchitectRecord) {
  return {
    id: String(a._id),
    slug: a.slug,
    domain: a.domain,
    developer: a.developer,
    target: a.target,
    env: a.env,
    status: a.status,
    jobId: a.jobId ?? null,
    error: a.error ?? null,
    progress: (a.progress ?? []).map((p) => ({ stage: p.stage, label: p.label, at: p.at })),
    lastSeenAt: a.lastSeenAt ?? null,
    online: a.online ?? null,
    telemetry: a.telemetry
      ? {
          status: a.telemetry.status,
          version: a.telemetry.version,
          uptimeSeconds: a.telemetry.uptimeSeconds,
          memPercent: a.telemetry.memPercent,
          services: a.telemetry.services,
          receivedAt: a.telemetry.receivedAt,
        }
      : null,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}
