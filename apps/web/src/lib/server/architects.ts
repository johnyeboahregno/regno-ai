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
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}
