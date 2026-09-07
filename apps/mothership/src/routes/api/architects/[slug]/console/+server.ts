// /api/architects/[slug]/console — per-Architect cluster console (option A).
//
// Each Architect in k3s mode maps to a namespace on a shared cluster. The Mothership
// keeps that cluster's kubeconfig in the vault (`architect:<slug>:env` → KUBECONFIG,
// AES-256-GCM at rest) and runs kubectl HERE — the kubeconfig never leaves the server.
//
// Scope is locked to the Architect's `target.cluster` context + `target.namespace`:
//   - the user's own --kubeconfig/--context/-n/--all-namespaces flags are rejected,
//   - only read / low-risk verbs are allowed (no exec/apply/edit/scale/port-forward…),
//   - `delete` is limited to pods, `rollout` to restart|status|history.
//
// Docs: docs/engineering/33-architect-console.md
import { json } from '@sveltejs/kit';
import { execFile, spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getArchitectBySlug, revealCredentialByName } from '@regno/db';
import { requireSession, isAdminRole } from '@regno/auth';
import type { ArchitectRecord } from '@regno/db';

const vaultName = (slug: string) => `architect:${slug}:env`;
/** k8s DNS-1123 label — validates pod/container names so nothing can smuggle args. */
const K8S_LABEL = /^[a-z0-9]([-a-z0-9.]*[a-z0-9])?$/;
/** SSE framing for the live-log stream. */
const sse = (obj: unknown) => `data: ${JSON.stringify(obj)}\n\n`;

/** Verbs the console will run. Everything else (exec, apply, edit, scale, cp, …) is denied. */
const ALLOWED_VERBS = new Set(['get', 'describe', 'top', 'logs', 'rollout', 'delete', 'explain', 'api-resources', 'version', 'auth', 'config']);
const ROLLOUT_SUBS = new Set(['restart', 'status', 'history']);
/** Cluster-scoped resources — kubectl errors if you pass -n for these. */
const CLUSTER_SCOPED = new Set([
  'nodes', 'no', 'namespaces', 'ns', 'persistentvolumes', 'pv', 'storageclasses', 'sc',
  'clusterroles', 'clusterrolebindings', 'componentstatuses', 'csr', 'apiservices', 'priorityclasses',
]);
/** Flags the caller may not set — they would override the locked-in scope. */
const FORBIDDEN_FLAG = /^(--kubeconfig|--context|--namespace|-n|--all-namespaces|-A|--as|--as-group|--cluster|--server|--token|--user)$/;

/** Split a console line into argv, honouring single/double quotes and backslash escapes. */
function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let cur = '';
  let quote: '"' | "'" | null = null;
  let esc = false;
  for (const ch of line) {
    if (esc) { cur += ch; esc = false; continue; }
    if (ch === '\\' && quote !== "'") { esc = true; continue; }
    if (quote) { if (ch === quote) quote = null; else cur += ch; continue; }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (/\s/.test(ch)) { if (cur) { tokens.push(cur); cur = ''; } continue; }
    cur += ch;
  }
  if (cur) tokens.push(cur);
  return tokens;
}

function runKubectl(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile('kubectl', args, { timeout: 45_000, maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (!err) return resolve({ code: 0, stdout: String(stdout), stderr: String(stderr) });
      // Non-zero exit carries code/stdout/stderr on the error; a hard failure (spawn,
      // timeout) has code 1 with an explanatory message we surface as stderr.
      const code = typeof (err as NodeJS.ErrnoException & { code?: number }).code === 'number'
        ? ((err as { code: number }).code)
        : 1;
      resolve({ code, stdout: String(stdout), stderr: String(stderr || err.message) });
    });
  });
}

/** Validate a command and normalise it into (argv, isNamespaced) or throw. */
function prepareCommand(raw: string): { argv: string[]; namespaced: boolean } {
  const argv = tokenize(raw.trim());
  if (!argv.length) throw new Error('empty command');
  const verb = argv[0];
  if (!ALLOWED_VERBS.has(verb)) {
    throw new Error(`verb "${verb}" is not allowed here (allowed: ${[...ALLOWED_VERBS].sort().join(', ')})`);
  }
  const rest = argv.slice(1);

  // Reject flags that would let the caller break out of the Architect's scope.
  for (const tok of rest) {
    if (tok === '-A' || tok === '--all-namespaces') throw new Error('--all-namespaces is not allowed — console is scoped to this Architect namespace');
    const base = tok.startsWith('--') ? tok.split('=')[0] : tok;
    if (FORBIDDEN_FLAG.test(base)) throw new Error(`flag "${base}" is not allowed — scope is locked to this Architect`);
  }

  // delete → pods only, and only by name.
  if (verb === 'delete') {
    if (rest[0] !== 'pod' && rest[0] !== 'pods') throw new Error('delete is limited to pods (e.g. "delete pod <name>")');
    if (!rest[1] || rest[1].startsWith('-')) throw new Error('delete pod requires a pod name');
  }
  // rollout → restart | status | history only.
  if (verb === 'rollout') {
    if (!ROLLOUT_SUBS.has(rest[0] ?? '')) throw new Error('rollout is limited to: restart | status | history (e.g. "rollout restart deployment/foo")');
    if (!rest[1] || rest[1].startsWith('-')) throw new Error('rollout requires a workload (e.g. "rollout restart deployment/foo")');
  }
  // logs → default a bounded tail so a busy pod can't flood the console.
  if (verb === 'logs' && !rest.some((t) => t.startsWith('--tail'))) {
    rest.push('--tail=200');
  }

  // Cluster-scoped resources (nodes, namespaces, pv, …) must NOT get -n injected;
  // client-style verbs (version/config/auth) don't take -n at all.
  const NO_NS_VERBS = new Set(['version', 'config', 'auth']);
  const resource = rest[0]?.toLowerCase() ?? '';
  const namespaced =
    !NO_NS_VERBS.has(verb) &&
    (verb === 'logs' || verb === 'delete' || verb === 'rollout' || !CLUSTER_SCOPED.has(resource));
  return { argv: [verb, ...rest], namespaced };
}

async function readKubeconfig(slug: string): Promise<string> {
  const raw = await revealCredentialByName(vaultName(slug));
  if (raw === null) return '';
  try {
    return String((JSON.parse(raw) as Record<string, string>).KUBECONFIG ?? '').trim();
  } catch {
    return '';
  }
}

/** Validate + materialise the console's connection context (throws on any gap). */
async function consoleContext(
  architect: ArchitectRecord,
): Promise<{ kubePath: string; cleanup: () => void }> {
  if (architect.target.mode !== 'k3s') throw new Error('Console is only available for k3s-namespace Architects (target.mode = k3s)');
  const { cluster, namespace } = architect.target;
  if (!cluster || !namespace) throw new Error('No k3s cluster/namespace configured for this Architect');
  const kubeconfig = await readKubeconfig(architect.slug);
  if (!kubeconfig) throw new Error('No KUBECONFIG stored for this Architect');

  const dir = mkdtempSync(join(tmpdir(), 'regno-kube-'));
  const kubePath = join(dir, 'config');
  writeFileSync(kubePath, kubeconfig, 'utf8');
  chmodSync(kubePath, 0o600);
  const cleanup = () => { try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ } };
  return { kubePath, cleanup };
}

/** SSE stream of `kubectl logs -f` for one pod in the Architect's namespace. */
async function streamPodLogs(architect: ArchitectRecord, url: URL): Promise<Response> {
  const { cluster, namespace } = architect.target;
  const pod = url.searchParams.get('pod') ?? '';
  const container = url.searchParams.get('container') ?? '';
  const tailRaw = Number(url.searchParams.get('tail') ?? '200');
  const tail = Number.isFinite(tailRaw) ? Math.max(0, Math.min(5000, Math.trunc(tailRaw))) : 200;

  if (!K8S_LABEL.test(pod)) return json({ ok: false, error: 'pod is required and must be a valid k8s name' }, { status: 400 });
  if (container && !K8S_LABEL.test(container)) return json({ ok: false, error: 'invalid container name' }, { status: 400 });

  let kubePath: string;
  let cleanup: () => void;
  try {
    ({ kubePath, cleanup } = await consoleContext(architect));
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, { status: 400 });
  }

  const args = ['--kubeconfig', kubePath, '--context', cluster as string, '-n', namespace as string, 'logs', pod];
  if (container) args.push('-c', container);
  args.push(`--tail=${tail}`, '--follow');

  const encoder = new TextEncoder();
  let child: ReturnType<typeof spawn> | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let finished = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enqueue = (obj: unknown) => { try { controller.enqueue(encoder.encode(sse(obj))); } catch { /* closed */ } };
      enqueue({ ready: true, command: `kubectl logs ${container ? `-c ${container} ` : ''}--tail=${tail} -f ${pod} (ns ${namespace})` });

      child = spawn('kubectl', args);
      if (!child.stdout || !child.stderr) {
        finished = true;
        cleanup();
        try { enqueue({ err: 'kubectl stream unavailable' }); enqueue({ done: true, code: 1 }); controller.close(); } catch { /* closed */ }
        return;
      }
      const dec = new TextDecoder();
      let buf = '';
      child.stdout.on('data', (d: Buffer) => {
        buf += dec.decode(d, { stream: true });
        let i: number;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).replace(/\r$/, '');
          buf = buf.slice(i + 1);
          if (line) enqueue({ line });
        }
      });
      child.stderr.on('data', (d: Buffer) => {
        const text = dec.decode(d, { stream: true }).trim();
        if (text) enqueue({ err: text });
      });
      child.on('close', (code) => {
        finished = true;
        if (heartbeat) clearInterval(heartbeat);
        cleanup();
        try { enqueue({ done: true, code: code ?? 0 }); controller.close(); } catch { /* closed */ }
      });
      child.on('error', (err) => {
        finished = true;
        if (heartbeat) clearInterval(heartbeat);
        cleanup();
        try { enqueue({ err: err.message }); enqueue({ done: true, code: 1 }); controller.close(); } catch { /* closed */ }
      });
      // Keep the SSE connection alive through quiet periods (proxies may time out idle streams).
      heartbeat = setInterval(() => {
        if (finished) return;
        try { controller.enqueue(encoder.encode(': ping\n\n')); } catch { /* closed */ }
      }, 15_000);
    },
    cancel() {
      finished = true;
      if (heartbeat) clearInterval(heartbeat);
      if (child && !child.killed) child.kill('SIGTERM');
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

/** Human age from a k8s RFC3339 startTime. */
function fmtAge(iso: string | undefined): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '0s';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

interface KubeList { items?: Array<Record<string, any>>; }
interface PodSum { name: string; phase: string; ready: string; restarts: number; age: string; containers: string[] }
interface WorkloadSum { name: string; desired: number; ready: number; available: number }
interface SvcSum { name: string; type: string; clusterIP: string; ports: string[] }

/** Structured, namespace-scoped inventory of pods / deployments / statefulsets / services. */
async function runWorkloads(architect: ArchitectRecord): Promise<Response> {
  let kubePath: string;
  let cleanup: () => void;
  try {
    ({ kubePath, cleanup } = await consoleContext(architect));
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
  try {
    const { cluster, namespace } = architect.target as { cluster: string; namespace: string };
    const base = ['--kubeconfig', kubePath, '--context', cluster, '-n', namespace];
    const [p, d, sts, svc] = await Promise.all([
      runKubectl([...base, 'get', 'pods', '-o', 'json']),
      runKubectl([...base, 'get', 'deployments', '-o', 'json']),
      runKubectl([...base, 'get', 'statefulsets', '-o', 'json']),
      runKubectl([...base, 'get', 'services', '-o', 'json']),
    ]);
    const failed = [p, d, sts, svc].find((r) => r.code !== 0);
    if (failed) return json({ ok: false, error: (failed.stderr || `kubectl exited ${failed.code}`).trim() }, { status: 502 });

    const pods: PodSum[] = ((JSON.parse(p.stdout) as KubeList).items ?? []).map((x) => {
      const cs = x.status?.containerStatuses ?? [];
      const ready = cs.filter((c: any) => c.ready).length;
      const restarts = cs.reduce((n: number, c: any) => n + (c.restartCount ?? 0), 0);
      return {
        name: x.metadata?.name ?? '',
        phase: x.status?.phase ?? '',
        ready: `${ready}/${cs.length || x.spec?.containers?.length || 0}`,
        restarts,
        age: fmtAge(x.status?.startTime),
        containers: (x.spec?.containers ?? []).map((c: any) => c.name ?? ''),
      };
    }).filter((x) => x.name);

    const workloads = (items: KubeList): WorkloadSum[] =>
      (items.items ?? []).map((x) => ({
        name: x.metadata?.name ?? '',
        desired: Number(x.spec?.replicas ?? 0),
        ready: Number(x.status?.readyReplicas ?? 0),
        available: Number(x.status?.availableReplicas ?? 0),
      })).filter((x) => x.name);

    const services: SvcSum[] = ((JSON.parse(svc.stdout) as KubeList).items ?? [])
      .map((x) => ({
        name: x.metadata?.name ?? '',
        type: x.spec?.type ?? '',
        clusterIP: x.spec?.clusterIP ?? '',
        ports: (x.spec?.ports ?? []).map((pt: any) => (pt.name ? `${pt.name} ` : '') + `${pt.port}/${pt.protocol ?? 'TCP'}`),
      }))
      .filter((x) => x.name);

    return json({
      ok: true,
      namespace,
      workloads: {
        pods,
        deployments: workloads(JSON.parse(d.stdout) as KubeList),
        statefulsets: workloads(JSON.parse(sts.stdout) as KubeList),
        services,
      },
    });
  } catch (e) {
    return json({ ok: false, error: `Failed to load workloads: ${(e as Error).message}` }, { status: 500 });
  } finally {
    cleanup();
  }
}

export async function GET({ params, url, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (!isAdminRole(user.role)) return json({ ok: false, error: 'Admin only' }, { status: 403 });

  const architect = await getArchitectBySlug(params.slug);
  if (!architect) return json({ ok: false, error: 'Not found' }, { status: 404 });

  if (url.searchParams.get('stream') === 'logs') {
    return streamPodLogs(architect, url);
  }
  if (url.searchParams.get('view') === 'workloads') {
    return runWorkloads(architect);
  }

  const kubeconfigConfigured = (await readKubeconfig(params.slug)) !== '';
  return json({
    ok: true,
    architect: {
      slug: architect.slug,
      mode: architect.target.mode,
      host: architect.target.host,
      cluster: architect.target.cluster ?? null,
      namespace: architect.target.namespace ?? null,
    },
    kubeconfigConfigured,
    consoleReady: architect.target.mode === 'k3s' && !!architect.target.cluster && !!architect.target.namespace && kubeconfigConfigured,
  });
}

export async function POST({ params, request, cookies }) {
  const user = await requireSession(cookies);
  if (!user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (!isAdminRole(user.role)) return json({ ok: false, error: 'Admin only' }, { status: 403 });

  const architect = await getArchitectBySlug(params.slug);
  if (!architect) return json({ ok: false, error: 'Not found' }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as { command?: string };
  let argv: string[];
  let namespaced: boolean;
  try {
    ({ argv, namespaced } = prepareCommand(String(body.command ?? '')));
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, { status: 400 });
  }

  // Materialise the Architect's vault KUBECONFIG to a throwaway 0600 file — never persisted.
  let kubePath: string;
  let cleanup: () => void;
  try {
    ({ kubePath, cleanup } = await consoleContext(architect));
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
  try {
    const { cluster, namespace } = architect.target;
    const kubectlArgs = ['--kubeconfig', kubePath, '--context', cluster as string];
    if (namespaced) kubectlArgs.push('-n', namespace as string);
    kubectlArgs.push(...argv);

    const { code, stdout, stderr } = await runKubectl(kubectlArgs);
    // Display copy — kubeconfig path omitted (it's a throwaway temp file).
    const display = ['kubectl', '--context', cluster, ...(namespaced ? ['-n', namespace] : []), ...argv].join(' ');
    return json({ ok: true, code, stdout, stderr, command: display });
  } finally {
    cleanup();
  }
}
