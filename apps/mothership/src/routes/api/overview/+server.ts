// GET /api/overview — control-plane dashboard stats for the Mothership.
import { json } from '@sveltejs/kit';
import { listArchitects, markStaleArchitectsOffline } from '@regno/db';
import { requireSession, isAdminRole } from '@regno/auth';

/** Heartbeats arrive every 30s; 3 missed beats ⇒ mark the Architect offline. */
const OFFLINE_AFTER_MS = 90_000;

export async function GET({ cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (!isAdminRole(user.role)) return json({ ok: false, error: 'Admin only' }, { status: 403 });

  await markStaleArchitectsOffline(OFFLINE_AFTER_MS);
  const architects = await listArchitects();

  const stats = {
    total: architects.length,
    online: architects.filter((a) => a.online === true).length,
    offline: architects.filter((a) => a.online === false).length,
    healthy: architects.filter((a) => a.status === 'healthy').length,
    provisioning: architects.filter((a) => a.status === 'provisioning').length,
    error: architects.filter((a) => a.status === 'error').length,
    draft: architects.filter((a) => a.status === 'draft').length,
  };

  return json({ ok: true, stats });
}
