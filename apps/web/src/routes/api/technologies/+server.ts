// /api/technologies — the technology catalog available to agent creation.
import { json } from '@sveltejs/kit';
import { requireSession } from '@regno/auth';
import { DISCIPLINES, LANGUAGES } from '$lib/server/sma.js';

export async function GET({ cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  return json({ ok: true, disciplines: DISCIPLINES, languages: LANGUAGES });
}
