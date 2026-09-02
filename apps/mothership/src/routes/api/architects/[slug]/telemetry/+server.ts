// /api/architects/[slug]/telemetry — ingest + read Architect telemetry (Regno Standard).
// POST is machine-authenticated (per-architect bearer token stored in the vault);
// GET is admin-only and returns the latest stored Regno Standard bundle.
import { json } from '@sveltejs/kit';
import { createHash, timingSafeEqual } from 'node:crypto';
import {
  getArchitectBySlug,
  revealCredentialByName,
  recordArchitectTelemetry,
  getArchitectTelemetry,
} from '@regno/db';
import { requireSession, isAdminRole } from '@regno/auth';

const vaultName = (slug: string) => `architect:${slug}:env`;

/** Timing-safe bearer token comparison (hash both sides to mask length). */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

function bearerToken(request: Request): string {
  const header = request.headers.get('authorization') ?? '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return request.headers.get('x-architect-token') ?? '';
}

function parseSummary(raw: unknown): { status: 'healthy' | 'degraded' | 'error'; version: string; uptimeSeconds: number; memPercent: number; services: Array<{ name: string; online: boolean; detail?: string }> } {
  const s = (raw ?? {}) as Record<string, unknown>;
  const status = s.status === 'healthy' || s.status === 'degraded' || s.status === 'error' ? s.status : 'degraded';
  const services = Array.isArray(s.services)
    ? (s.services as Array<Record<string, unknown>>).map((x) => ({
        name: String(x.name ?? ''),
        online: Boolean(x.online),
        detail: x.detail === undefined ? undefined : String(x.detail),
      }))
    : [];
  return {
    status,
    version: String(s.version ?? 'unknown'),
    uptimeSeconds: Number(s.uptimeSeconds ?? 0) || 0,
    memPercent: Number(s.memPercent ?? 0) || 0,
    services,
  };
}

export async function POST({ params, request }) {
  const slug = params.slug;
  const architect = await getArchitectBySlug(slug);
  if (!architect) return json({ ok: false, error: 'Not found' }, { status: 404 });

  // Machine auth: the Architect authenticates with the per-slug telemetry token.
  const raw = await revealCredentialByName(vaultName(slug));
  let token = '';
  if (raw) {
    try {
      token = (JSON.parse(raw) as Record<string, string>).ARCHITECT_TELEMETRY_TOKEN ?? '';
    } catch {
      token = '';
    }
  }
  if (!token || !safeEqual(bearerToken(request), token)) {
    return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    configDocId?: string;
    docs?: Record<string, unknown>[];
    summary?: unknown;
  };

  const docs = Array.isArray(body.docs) ? body.docs : [];
  if (!body.configDocId && !docs.some((d) => d?.type === 'ConfigDoc')) {
    return json({ ok: false, error: 'Regno Standard ConfigDoc required' }, { status: 400 });
  }

  await recordArchitectTelemetry(slug, {
    configDocId: body.configDocId ?? `cfg-architect-${slug}`,
    docs,
    summary: parseSummary(body.summary),
  });

  return json({ ok: true, received: docs.length });
}

export async function GET({ params, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (!isAdminRole(user.role)) return json({ ok: false, error: 'Admin only' }, { status: 403 });

  const telemetry = await getArchitectTelemetry(params.slug);
  if (!telemetry) return json({ ok: true, telemetry: null });
  return json({ ok: true, telemetry });
}
