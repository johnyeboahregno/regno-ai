// POST /api/test/email — send a test email through the notifications queue.
import { json } from '@sveltejs/kit';
import { enqueueEmail } from '@regno/mail';
import { requireSession } from '@regno/auth';

export async function POST({ request, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { to?: string; subject?: string };
  const to = String(body.to ?? '').trim();
  if (!to) return json({ ok: false, error: 'to is required' }, { status: 400 });

  const job = await enqueueEmail({
    to,
    subject: body.subject ?? 'Test from Regno Architect Me',
    text: 'This is a test notification from your self-hosted Regno platform.',
  });
  return json({ ok: true, jobId: job.id });
}
