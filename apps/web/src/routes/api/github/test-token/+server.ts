// POST /api/github/test-token — validate a GitHub PAT and check access to the wizard's repos.
// Used by the "Test token" button on Step 3 of the Architect wizard. The token only ever
// travels in the request body; it is never stored, logged, or echoed back.
import { json } from '@sveltejs/kit';
import { requireSession } from '$lib/server/auth.js';

export async function POST({ request, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'owner') return json({ ok: false, error: 'Admin only' }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { token?: string; repos?: string[] };
  const token = String(body.token ?? '').trim();
  const repos = Array.isArray(body.repos) ? body.repos.map(String).filter(Boolean) : [];
  if (!token) return json({ ok: false, error: 'token is required' }, { status: 400 });

  const headers = {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'regno-web',
    Accept: 'application/vnd.github+json',
  };

  const who = await fetch('https://api.github.com/user', { headers });
  if (who.status === 401 || who.status === 403) {
    return json({ ok: false, error: 'Invalid token — GitHub returned 401 Unauthorized.' });
  }
  if (!who.ok) {
    return json({ ok: false, error: `GitHub API error ${who.status} while validating token.` });
  }
  const whoJson = (await who.json().catch(() => ({}))) as { login?: string; name?: string };

  const repoChecks: Array<{ repo: string; accessible: boolean; status: number }> = [];
  for (const repo of repos) {
    const r = await fetch(`https://api.github.com/repos/${repo}`, { headers });
    repoChecks.push({ repo, status: r.status, accessible: r.status === 200 });
  }

  return json({
    ok: true,
    user: { login: whoJson.login ?? null, name: whoJson.name ?? null },
    repos: repoChecks,
  });
}
