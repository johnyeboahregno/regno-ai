// /api/architects/[slug]/secrets — store/reveal the encrypted env blob for an
// Architect. All secrets are persisted as ONE vault credential
// `architect:<slug>:env` (AES-256-GCM at rest) — never echoed back masked.
import { json } from '@sveltejs/kit';
import { randomBytes } from 'node:crypto';
import { getArchitectBySlug, upsertCredentialByName, revealCredentialByName } from '@regno/db';
import { requireSession, isAdminRole } from '@regno/auth';

const vaultName = (slug: string) => `architect:${slug}:env`;

export async function PUT({ params, request, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (!isAdminRole(user.role)) return json({ ok: false, error: 'Admin only' }, { status: 403 });

  const architect = await getArchitectBySlug(params.slug);
  if (!architect) return json({ ok: false, error: 'Not found' }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as { secrets?: Record<string, string> };
  const secrets = body.secrets ?? {};
  if (!secrets || typeof secrets !== 'object' || !Object.keys(secrets).length) {
    return json({ ok: false, error: 'secrets is required' }, { status: 400 });
  }

  // Preserve the existing telemetry token across re-saves (it is minted once and
  // baked into the Architect's .env.prod; regenerating it would strand the machine).
  const existingRaw = await revealCredentialByName(vaultName(params.slug));
  let existing: Record<string, string> = {};
  if (existingRaw) {
    try {
      existing = JSON.parse(existingRaw) as Record<string, string>;
    } catch {
      existing = {};
    }
  }
  if (!existing.ARCHITECT_TELEMETRY_TOKEN) {
    existing.ARCHITECT_TELEMETRY_TOKEN = randomBytes(24).toString('hex');
  }

  const merged = { ...existing, ...secrets };
  await upsertCredentialByName(vaultName(params.slug), {
    type: 'env',
    provider: 'architect',
    secret: JSON.stringify(merged),
  });
  return json({ ok: true, stored: Object.keys(merged) });
}

export async function GET({ params, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (!isAdminRole(user.role)) return json({ ok: false, error: 'Admin only' }, { status: 403 });

  const raw = await revealCredentialByName(vaultName(params.slug));
  if (raw === null) return json({ ok: true, secrets: null });
  let secrets: unknown;
  try {
    secrets = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: 'Stored secrets are malformed' }, { status: 500 });
  }
  return json({ ok: true, secrets });
}
