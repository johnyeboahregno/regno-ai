import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { json } from '@sveltejs/kit';
import { requireAdmin } from '@regno/auth';

const execFileAsync = promisify(execFile);
const EXECUTION_SERVICE = 'execution';

async function docker(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('docker', args, { timeout: 30_000 });
  return stdout.trim();
}

export async function POST({ cookies }) {
  const user = await requireAdmin(cookies);
  if (!user) return json({ ok: false, error: 'Admin only' }, { status: 403 });

  const project = process.env.REGNO_COMPOSE_PROJECT ?? process.env.COMPOSE_PROJECT_NAME ?? 'regno-architect';

  try {
    const ids = await docker([
      'ps',
      '-q',
      '--filter',
      `label=com.docker.compose.project=${project}`,
      '--filter',
      `label=com.docker.compose.service=${EXECUTION_SERVICE}`,
    ]);

    const containerId = ids.split('\n').find(Boolean);
    if (!containerId) {
      return json(
        { ok: false, error: `No running ${EXECUTION_SERVICE} container found for ${project}` },
        { status: 404 },
      );
    }

    await docker(['restart', containerId]);
    return json({ ok: true, service: EXECUTION_SERVICE, project });
  } catch (err) {
    return json(
      { ok: false, error: `Execution restart failed: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}