// GET /api/system-health — aggregate build / test / deployment history for the
// system-health grids on the docs page (last 50 events each).
//
// Sources:
//   builds       → cortex_executions   (Cortex Flow runs that build artifacts)
//   tests        → maestro_validations (MAESTRO rule validations)
//   deployments  → audit               (deploy / release / rollback actions)
import { json } from '@sveltejs/kit';
import { getDb } from '@regno/db';
import { Collections } from '@regno/shared';
import { requireSession } from '@regno/auth';

type Status = 'success' | 'failed';

export interface HealthEvent {
  id: string;
  label: string;
  status: Status;
  date: string;
  detail?: string;
}

const SUCCESS = new Set(['complete', 'completed', 'success', 'succeeded', 'passed', 'pass', 'ok', 'true', '1']);
const FAIL = new Set(['failed', 'fail', 'error', 'false', '0']);

function toStatus(raw: unknown): Status | null {
  const s = String(raw ?? '').trim().toLowerCase();
  if (SUCCESS.has(s)) return 'success';
  if (FAIL.has(s)) return 'failed';
  return null;
}

function toIso(v: unknown): string {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString();
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? new Date(t).toISOString() : '';
}

function sortLimit<T extends { date: string }>(list: T[], n: number): T[] {
  return list
    .filter((x) => x.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, n);
}

export async function GET({ cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();

  // Builds — agent executions (the "builds" the architect performs).
  const execs = await db
    .collection(Collections.CORTEX_EXECUTIONS)
    .find({}, { projection: { taskId: 1, prompt: 1, status: 1, error: 1, createdAt: 1 } })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

  const builds: HealthEvent[] = execs.map((e) => ({
    id: String(e.taskId ?? e._id ?? ''),
    label: String(e.prompt ?? 'build'),
    status: toStatus(e.status) ?? 'failed',
    date: toIso(e.createdAt),
    detail: e.error ? String(e.error) : undefined,
  }));

  // Tests — MAESTRO validation results.
  const vals = await db
    .collection(Collections.MAESTRO_VALIDATIONS)
    .find({})
    .limit(200)
    .toArray();

  const tests: HealthEvent[] = sortLimit(
    vals.map((v) => ({
      id: String(v._id ?? v.processId ?? ''),
      label: String(v.rule ?? v.name ?? v.test ?? 'validation'),
      status: toStatus(v.result) ?? toStatus(v.passed) ?? 'failed',
      date: toIso(v.createdAt ?? v.at ?? v.ts),
      detail: v.processId ? String(v.processId) : undefined,
    })),
    50,
  );

  // Deployments — deploy-ish audit trail actions.
  const audits = await db
    .collection(Collections.AUDIT)
    .find({ action: { $regex: /deploy|release|rollback/i } })
    .limit(200)
    .toArray();

  const deployments: HealthEvent[] = sortLimit(
    audits.map((a) => ({
      id: String(a._id ?? ''),
      label: String(a.action ?? 'deploy'),
      status: toStatus(a.status) ?? 'success',
      date: toIso(a.ts ?? a.createdAt ?? a.at),
      detail: a.actor ? String(a.actor) : undefined,
    })),
    50,
  );

  return json({ ok: true, builds, tests, deployments });
}
