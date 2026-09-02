// /api/technologies — the technology catalog available to agent creation.
import { json } from '@sveltejs/kit';
import { requireSession } from '@regno/auth';

interface CatalogItem { slug: string; label: string; icon: string }

const DISCIPLINES: CatalogItem[] = [
  { slug: 'web', label: 'Web Development', icon: '🌐' },
  { slug: 'backend', label: 'Backend / APIs', icon: '🔌' },
  { slug: 'data-engineering', label: 'Data Engineering', icon: '🗄️' },
  { slug: 'machine-learning', label: 'Machine Learning / AI', icon: '🧠' },
  { slug: 'devops', label: 'DevOps / Platform', icon: '🚀' },
  { slug: 'embedded', label: 'Embedded Systems', icon: '🔧' },
  { slug: 'ros', label: 'Robotics (ROS)', icon: '🤖' },
  { slug: 'security', label: 'Security', icon: '🛡️' },
  { slug: 'mobile', label: 'Mobile Apps', icon: '📱' },
];

const LANGUAGES: CatalogItem[] = [
  { slug: 'web-typescript', label: 'Web / TypeScript', icon: '🕸️' },
  { slug: 'go', label: 'Go', icon: '🐹' },
  { slug: 'rust', label: 'Rust', icon: '🦀' },
  { slug: 'python', label: 'Python', icon: '🐍' },
  { slug: 'cpp', label: 'C++', icon: '⚡' },
  { slug: 'c', label: 'C', icon: '🏗️' },
  { slug: 'java', label: 'Java', icon: '☕' },
  { slug: 'kotlin', label: 'Kotlin', icon: '🎯' },
  { slug: 'swift', label: 'Swift', icon: '🦅' },
  { slug: 'csharp', label: 'C# / .NET', icon: '💜' },
  { slug: 'php', label: 'PHP', icon: '🐘' },
  { slug: 'ruby', label: 'Ruby', icon: '💎' },
  { slug: 'elixir', label: 'Elixir', icon: '💧' },
  { slug: 'zig', label: 'Zig', icon: '⚙️' },
  { slug: 'sql', label: 'SQL', icon: '🗃️' },
  { slug: 'shell', label: 'Shell / Bash', icon: '🐚' },
];

export async function GET({ cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  return json({ ok: true, disciplines: DISCIPLINES, languages: LANGUAGES });
}
