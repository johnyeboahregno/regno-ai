// /api/technologies — the technology catalog available to agent creation.
import { json } from '@sveltejs/kit';
import { requireSession } from '$lib/server/auth.js';

const TECHNOLOGIES = [
  { slug: 'web-typescript', label: 'Web / TypeScript', icon: '🕸️' },
  { slug: 'go', label: 'Go', icon: '🐹' },
  { slug: 'rust', label: 'Rust', icon: '🦀' },
  { slug: 'python', label: 'Python', icon: '🐍' },
  { slug: 'ros', label: 'ROS', icon: '🤖' },
];

export async function GET({ cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  return json({ ok: true, technologies: TECHNOLOGIES });
}
