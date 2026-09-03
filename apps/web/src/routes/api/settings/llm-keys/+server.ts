import { json } from '@sveltejs/kit';
import { listLlmApiKeySettings, saveLlmApiKeySettings, type LlmApiKeyName } from '@regno/db';
import { requireSession } from '@regno/auth';

export async function GET({ cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  return json({ ok: true, keys: await listLlmApiKeySettings() });
}

export async function PUT({ request, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { keys?: Partial<Record<LlmApiKeyName, string>> };
  await saveLlmApiKeySettings(body.keys ?? {});

  return json({ ok: true, keys: await listLlmApiKeySettings() });
}