/**
 * Architect provisioning executor — runs on the execution worker. Loads the
 * blueprint + decrypted secrets, then drives the target machine over SSH:
 *   wipe (optional) → clone/update repo → write .env.prod → deploy.sh → DNS.
 *
 * SSH is driven via the system `ssh` client (key auth, or password via `sshpass`
 * when available). The execution image must include openssh-client (+ sshpass for
 * password auth) — see apps/execution/Dockerfile.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getArchitectBySlug, setArchitectStatus, revealCredentialByName, appendArchitectProgress } from '@regno/db';
import { buildEnvPayload } from './env.js';
import { upsertDnsRecord } from './cloudflare.js';

export type ProvisionEvent = (event: string, data: unknown) => void;

interface SshAuth {
  privateKey?: string;
  password?: string;
}

function run(cmd: string, args: string[], stdin?: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d: Buffer) => (stdout += d.toString()));
    child.stderr.on('data', (d: Buffer) => (stderr += d.toString()));
    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} exited ${code}: ${(stderr || stdout).trim()}`));
    });
    if (stdin) child.stdin.write(stdin);
    child.stdin.end();
  });
}

/** Run a command on the target over SSH, returning its combined output. */
async function sshExec(
  target: { host: string; sshUser: string; sshPort: number },
  auth: SshAuth,
  command: string,
  stdin?: string,
): Promise<string> {
  const sshOpts = ['-o', 'StrictHostKeyChecking=no', '-o', 'UserKnownHostsFile=/dev/null', '-o', 'LogLevel=ERROR', '-o', 'ConnectTimeout=15'];
  const dest = `${target.sshUser}@${target.host}`;

  if (auth.privateKey) {
    const dir = mkdtempSync(join(tmpdir(), 'regno-ssh-'));
    const keyPath = join(dir, 'key');
    // OpenSSH rejects CRLF line endings in private keys with
    // "Load key: error in libcrypto: unsupported" — normalise any Windows
    // line endings (\r\n or stray \r) before writing.
    writeFileSync(keyPath, auth.privateKey.replace(/\r/g, ''));
    chmodSync(keyPath, 0o600);
    try {
      const { stdout, stderr } = await run('ssh', [...sshOpts, '-i', keyPath, '-p', String(target.sshPort), dest, command], stdin);
      return stdout || stderr;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  if (auth.password) {
    const { stdout, stderr } = await run('sshpass', ['-p', auth.password, 'ssh', ...sshOpts, '-p', String(target.sshPort), dest, command], stdin);
    return stdout || stderr;
  }

  throw new Error('No SSH key or password provided');
}

export async function provisionArchitect(slug: string, onEvent: ProvisionEvent): Promise<void> {
  const architect = await getArchitectBySlug(slug);
  if (!architect) throw new Error(`Architect "${slug}" not found`);

  const secretsRaw = await revealCredentialByName(`architect:${slug}:env`);
  let secrets: Record<string, string> = {};
  try {
    secrets = secretsRaw ? (JSON.parse(secretsRaw) as Record<string, string>) : {};
  } catch {
    throw new Error(`Stored secrets for "${slug}" are malformed`);
  }

  const { host, sshUser, sshPort, wipe } = architect.target;
  const auth: SshAuth = { privateKey: secrets.SSH_KEY, password: secrets.SSH_PASSWORD };
  const repoUrl = secrets.REPO_URL || process.env.REPO_URL || '';
  const envPayload = buildEnvPayload(architect.env, secrets, slug);

  const emit = (event: string, data: unknown) => onEvent(`provision:${event}`, { slug, ...(data as object) });

  // Emit to the realtime bus AND persist a human-readable step for the wizard.
  const log = (stage: string, label: string, data: unknown = {}) => {
    emit(stage, data);
    void appendArchitectProgress(slug, { stage, label }).catch(() => {});
  };

  try {
    await setArchitectStatus(slug, 'provisioning');
    log('start', `Connecting to ${host}`, { host });

    // 1. Prepare the app dir.
    log('prepare', 'Preparing /opt/regno on the target machine');
    await sshExec({ host, sshUser, sshPort }, auth, 'sudo mkdir -p /opt/regno && sudo chown -R "$(id -u):$(id -g)" /opt/regno');

    // 2. Clone or update the repo.
    if (repoUrl) {
      log('fetch', `Fetching code from ${repoUrl}`, { repo: repoUrl });
      await sshExec(
        { host, sshUser, sshPort },
        auth,
        `if [ -d /opt/regno/.git ]; then git -C /opt/regno pull --ff-only; else git clone "${repoUrl}" /opt/regno; fi`,
      );
    }

    // 3. Write .env.prod (non-interactive deploy).
    log('env', 'Writing .env.prod');
    await sshExec({ host, sshUser, sshPort }, auth, 'cat > /opt/regno/.env.prod', envPayload);

    // 4. Optional wipe.
    if (wipe) {
      log('wipe', 'Wiping existing deployment (docker compose down -v)');
      await sshExec({ host, sshUser, sshPort }, auth, 'cd /opt/regno && docker compose down -v 2>/dev/null || true');
    }

    // 5. Deploy (installs Docker/Node if needed, builds, seeds).
    log('deploy', 'Building & seeding via deploy.sh — this is the longest step');
    await sshExec({ host, sshUser, sshPort }, auth, 'cd /opt/regno && APP_DIR=/opt/regno sudo -E bash deploy.sh');

    // 6. Cloudflare DNS.
    log('dns', 'Registering Cloudflare DNS record');
    const dns = await upsertDnsRecord(slug, host, true);
    log('dns-done', 'Cloudflare DNS ready', dns);

    await setArchitectStatus(slug, 'healthy', { error: null });
    log('done', `Architect ready at ${architect.domain}`, { domain: architect.domain });
  } catch (err) {
    const message = (err as Error).message;
    await setArchitectStatus(slug, 'error', { error: message });
    emit('error', { error: message });
    void appendArchitectProgress(slug, { stage: 'error', label: message }).catch(() => {});
    throw err;
  }
}
