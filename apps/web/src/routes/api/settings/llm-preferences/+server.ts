import { json } from '@sveltejs/kit';
import { getLlmPreferences, LLM_PROVIDERS, saveLlmPreferences } from '@regno/db';
import { requireSession } from '@regno/auth';

export async function GET({ cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  return json({ ok: true, providers: LLM_PROVIDERS, preferences: await getLlmPreferences() });
}

export async function PUT({ request, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'owner') return json({ ok: false, error: 'Admin only' }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { preferences?: unknown };
  return json({ ok: true, preferences: await saveLlmPreferences(body.preferences ?? {}) });
}