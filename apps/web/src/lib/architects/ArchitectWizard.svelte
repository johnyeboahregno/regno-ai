<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import PasswordInput from '$lib/PasswordInput.svelte';

  export let onDone: () => void = () => {};

  const dispatch = createEventDispatcher();

  let step = 1;
  let busy = false;
  let error = '';
  let status = '';
  let progress: Array<{ stage: string; label: string; at: string }> = [];
  let phase: 'running' | 'done' | 'error' = 'running';

  let form = {
    slug: '',
    name: '',
    email: '',
    github: '',

    host: '',
    sshUser: 'root',
    sshPort: 22,
    mode: 'server' as 'server' | 'k3s',
    wipe: false,
    sshAuth: 'key' as 'key' | 'password',
    sshKey: '',
    sshPassword: '',

    openai: '',
    anthropic: '',
    google: '',
    deepseek: '',

    smtpHost: 'mail.postale.io',
    smtpPort: '587',
    smtpUser: 'admin@regnocloud.com',
    smtpPass: '',
    smtpEnc: 'tls',
    smtpFromEmail: 'admin@regnocloud.com',
    smtpFromName: 'Regno Cloud Admin',

    neo4jPass: '',
    mongoPass: '',
    jwtSecret: '',
    githubOrg: 'regno-platform',
    githubToken: '',
    dockerUser: '',
    dockerToken: '',
  };

  function genSecret(len = 32): string {
    const bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, len);
  }

  const slugPreview = () => `${form.slug.trim() || 'name'}.regno.ai`;

  async function testGitHub() {
    if (!form.githubToken) return;
    busy = true;
    error = '';
    try {
      const r = await fetch('/api/github/test-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: form.githubToken, repos: form.githubOrg ? [`${form.githubOrg}`] : [] }),
      });
      const d = await r.json();
      if (d.ok) {
        const login = d.user?.login ? ` as ${d.user.login}` : '';
        status = `GitHub token valid${login}`;
      } else {
        error = d.error ?? 'GitHub token check failed';
      }
    } catch {
      error = 'Cannot reach the GitHub check endpoint';
    } finally {
      busy = false;
    }
  }

  function buildEnv(): Record<string, string> {
    return {
      TLS_EMAIL: form.email || form.smtpFromEmail,
      SMTP_HOST: form.smtpHost,
      SMTP_PORT: form.smtpPort,
      SMTP_USERNAME: form.smtpUser,
      SMTP_ENCRYPTION: form.smtpEnc,
      SMTP_FROM_EMAIL: form.smtpFromEmail,
      SMTP_FROM_NAME: form.smtpFromName,
      ALLOWED_ORIGINS: `https://${slugPreview()}`,
      GITHUB_ORG: form.githubOrg,
    };
  }

  function buildSecrets(): Record<string, string> {
    const s: Record<string, string> = {};
    const set = (k: string, v: string) => { if (v) s[k] = v; };
    set('SSH_KEY', form.sshAuth === 'key' ? form.sshKey : '');
    set('SSH_PASSWORD', form.sshAuth === 'password' ? form.sshPassword : '');
    set('OPENAI_API_KEY', form.openai);
    set('ANTHROPIC_API_KEY', form.anthropic);
    set('GOOGLE_AI_API_KEY', form.google);
    set('DEEPSEEK_API_KEY', form.deepseek);
    set('SMTP_PASSWORD', form.smtpPass);
    set('NEO4J_PASSWORD', form.neo4jPass);
    set('MONGO_PASSWORD', form.mongoPass);
    set('JWT_SECRET', form.jwtSecret);
    set('GITHUB_TOKEN', form.githubToken);
    set('DOCKERHUB_USERNAME', form.dockerUser);
    set('DOCKERHUB_TOKEN', form.dockerToken);
    return s;
  }

  async function saveAndLaunch() {
    busy = true;
    error = '';
    status = '';
    progress = [];
    phase = 'running';
    try {
      const slug = form.slug.trim().toLowerCase();
      const developer = { name: form.name.trim(), email: form.email.trim(), github: form.github.trim() };
      const target = {
        host: form.host.trim(),
        sshUser: form.sshUser.trim() || 'root',
        sshPort: form.sshPort,
        mode: form.mode,
        wipe: form.wipe,
      };
      const env = buildEnv();
      const secrets = buildSecrets();

      // 1. Create the draft.
      const created = await fetch('/api/architects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, developer, target, env }),
      });
      const c = await created.json();
      if (!c.ok) { error = c.error ?? 'Failed to create Architect'; return; }

      // 2. Store encrypted secrets.
      const sec = await fetch(`/api/architects/${slug}/secrets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secrets }),
      });
      const sd = await sec.json();
      if (!sd.ok) { error = sd.error ?? 'Failed to store secrets'; return; }

      // 3. Launch.
      const launched = await fetch(`/api/architects/${slug}/launch`, { method: 'POST' });
      const ld = await launched.json();
      if (!ld.ok) { error = ld.error ?? 'Failed to launch'; return; }

      status = `Provisioning "${slug}"… (job ${ld.jobId})`;
      dispatch('launched', { slug });
      pollStatus(slug);
    } catch (e) {
      error = (e as Error).message ?? 'Failed to launch';
      busy = false;
    }
  }

  async function pollStatus(slug: string) {
    for (let i = 0; i < 180; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const r = await fetch(`/api/architects/${slug}`);
        const d = await r.json();
        if (d.ok) {
          status = `Status: ${d.architect.status}`;
          if (d.architect.error) status += ` — ${d.architect.error}`;
          if (Array.isArray(d.architect.progress)) progress = d.architect.progress;
          if (d.architect.status === 'healthy') phase = 'done';
          if (d.architect.status === 'error') phase = 'error';
          if (d.architect.status === 'healthy' || d.architect.status === 'error') {
            busy = false;
            onDone();
            return;
          }
        }
      } catch {
        /* keep polling */
      }
    }
    busy = false;
    onDone();
  }

  function stepDone(i: number): boolean {
    if (phase === 'done') return true;
    if (phase === 'error' && i === progress.length - 1) return false;
    return i < progress.length - 1;
  }

  function close() {
    if (!busy) dispatch('close');
  }
</script>

<div class="modal-backdrop" on:click={close}>
  <div class="modal wide" role="dialog" aria-modal="true" aria-label="New Architect" on:click|stopPropagation>
    <div class="modal-head">
      <span class="eyebrow blue">New Architect</span>
      <button class="x" on:click={close}>✕</button>
    </div>

    <div class="modal-body">
      {#if step === 1}
        <div class="eyebrow blue mb">Step 1 · Developer</div>
        <div class="grid grid-2">
          <div>
            <label for="a-name">Full name</label>
            <input class="input" id="a-name" bind:value={form.name} placeholder="John Smith" />
          </div>
          <div>
            <label for="a-email">Email</label>
            <input class="input" id="a-email" bind:value={form.email} placeholder="john@regnocloud.com" />
          </div>
        </div>
        <div class="grid grid-2 mt">
          <div>
            <label for="a-slug">Architect name (slug)</label>
            <input class="input mono" id="a-slug" bind:value={form.slug} placeholder="john" />
          </div>
          <div>
            <label for="a-github">GitHub username</label>
            <input class="input" id="a-github" bind:value={form.github} placeholder="optional" />
          </div>
        </div>
        <p class="muted small mt">Live domain: <span class="mono">{slugPreview()}</span></p>

      {:else if step === 2}
        <div class="eyebrow blue mb">Step 2 · Target machine</div>
        <div class="grid grid-3">
          <div>
            <label for="a-host">Host / IP</label>
            <input class="input mono" id="a-host" bind:value={form.host} placeholder="213.32.7.227" />
          </div>
          <div>
            <label for="a-user">SSH user</label>
            <input class="input" id="a-user" bind:value={form.sshUser} placeholder="root" />
          </div>
          <div>
            <label for="a-port">SSH port</label>
            <input class="input" id="a-port" type="number" bind:value={form.sshPort} />
          </div>
        </div>
        <div class="grid grid-2 mt">
          <div>
            <label for="a-mode">Deploy mode</label>
            <select class="input" id="a-mode" bind:value={form.mode}>
              <option value="server">Fresh server (deploy.sh)</option>
              <option value="k3s">k3s namespace</option>
            </select>
          </div>
          <div class="mt2">
            <label class="check-label">
              <input type="checkbox" bind:checked={form.wipe} />
              Wipe existing deployment before build
            </label>
          </div>
        </div>
        <div class="mt">
          <div style="display:flex; gap:16px; margin-bottom:8px;">
            <label class="check-label"><input type="radio" bind:group={form.sshAuth} value="key" /> SSH private key</label>
            <label class="check-label"><input type="radio" bind:group={form.sshAuth} value="password" /> SSH password</label>
          </div>
          {#if form.sshAuth === 'key'}
            <label for="a-key">SSH private key</label>
            <textarea class="input" id="a-key" rows="5" bind:value={form.sshKey} placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"></textarea>
          {:else}
            <label for="a-pass">SSH password</label>
            <PasswordInput bind:value={form.sshPassword} id="a-pass" label="SSH password" autocomplete="new-password" />
          {/if}
        </div>

      {:else if step === 3}
        <div class="eyebrow blue mb">Step 3 · AI provider keys <span class="muted small">(all optional)</span></div>
        <div class="grid grid-2">
          <div><label for="a-openai">OpenAI API key</label><PasswordInput bind:value={form.openai} id="a-openai" label="OpenAI" autocomplete="new-password" required={false} /></div>
          <div><label for="a-anthropic">Anthropic API key</label><PasswordInput bind:value={form.anthropic} id="a-anthropic" label="Anthropic" autocomplete="new-password" required={false} /></div>
          <div><label for="a-google">Google AI key</label><PasswordInput bind:value={form.google} id="a-google" label="Google AI" autocomplete="new-password" required={false} /></div>
          <div><label for="a-deepseek">DeepSeek API key</label><PasswordInput bind:value={form.deepseek} id="a-deepseek" label="DeepSeek" autocomplete="new-password" required={false} /></div>
        </div>

      {:else if step === 4}
        <div class="eyebrow blue mb">Step 4 · Email / SMTP</div>
        <div class="grid grid-3">
          <div><label for="a-sh">SMTP host</label><input class="input" id="a-sh" bind:value={form.smtpHost} /></div>
          <div><label for="a-sp">SMTP port</label><input class="input" id="a-sp" bind:value={form.smtpPort} /></div>
          <div><label for="a-su">SMTP username</label><input class="input" id="a-su" bind:value={form.smtpUser} /></div>
        </div>
        <div class="grid grid-2 mt">
          <div><label for="a-senc">Encryption</label>
            <select class="input" id="a-senc" bind:value={form.smtpEnc}>
              <option value="tls">tls</option>
              <option value="ssl">ssl</option>
              <option value="">none</option>
            </select>
          </div>
          <div><label for="a-sfrom">From email</label><input class="input" id="a-sfrom" bind:value={form.smtpFromEmail} /></div>
        </div>
        <div class="grid grid-2 mt">
          <div><label for="a-sfromname">From name</label><input class="input" id="a-sfromname" bind:value={form.smtpFromName} /></div>
          <div><label for="a-spass">SMTP password</label><PasswordInput bind:value={form.smtpPass} id="a-spass" label="SMTP password" autocomplete="new-password" required={false} /></div>
        </div>

      {:else if step === 5}
        <div class="eyebrow blue mb">Step 5 · Databases & security</div>
        <div class="grid grid-3">
          <div>
            <label for="a-neo4j">Neo4j password</label>
            <div style="display:flex; gap:8px;">
              <input class="input mono" id="a-neo4j" bind:value={form.neo4jPass} />
              <button type="button" class="btn ghost" style="padding:0 12px;" on:click={() => (form.neo4jPass = genSecret(20))}>⚡</button>
            </div>
          </div>
          <div>
            <label for="a-mongo">Mongo password</label>
            <div style="display:flex; gap:8px;">
              <input class="input mono" id="a-mongo" bind:value={form.mongoPass} />
              <button type="button" class="btn ghost" style="padding:0 12px;" on:click={() => (form.mongoPass = genSecret(20))}>⚡</button>
            </div>
          </div>
          <div>
            <label for="a-jwt">JWT secret</label>
            <div style="display:flex; gap:8px;">
              <input class="input mono" id="a-jwt" bind:value={form.jwtSecret} />
              <button type="button" class="btn ghost" style="padding:0 12px;" on:click={() => (form.jwtSecret = genSecret(32))}>⚡</button>
            </div>
          </div>
        </div>
        <div class="mt">
          <div class="grid grid-2">
            <div><label for="a-ghorg">GitHub org</label><input class="input" id="a-ghorg" bind:value={form.githubOrg} /></div>
            <div>
              <label for="a-ghtoken">GitHub token</label>
              <div style="display:flex; gap:8px;">
                <PasswordInput bind:value={form.githubToken} id="a-ghtoken" label="GitHub token" autocomplete="new-password" required={false} />
                <button type="button" class="btn ghost" style="padding:0 12px;" on:click={testGitHub}>Test</button>
              </div>
            </div>
          </div>
          <div class="grid grid-2 mt">
            <div><label for="a-dhuser">Docker Hub username</label><input class="input" id="a-dhuser" bind:value={form.dockerUser} placeholder="optional" /></div>
            <div><label for="a-dhtoken">Docker Hub token</label><PasswordInput bind:value={form.dockerToken} id="a-dhtoken" label="Docker Hub token" autocomplete="new-password" required={false} /></div>
          </div>
        </div>

      {:else if step === 6}
        <div class="eyebrow blue mb">Step 6 · Review & launch</div>
        <div class="panel" style="padding:14px; overflow-x:auto;">
          <table>
            <tbody>
              <tr><td class="muted">Domain</td><td class="mono">{slugPreview()}</td></tr>
              <tr><td class="muted">Developer</td><td>{form.name || '—'}</td></tr>
              <tr><td class="muted">Target</td><td class="mono">{form.sshUser}@{form.host || '—'}:{form.sshPort} ({form.mode})</td></tr>
              <tr><td class="muted">Wipe first</td><td>{form.wipe ? 'yes' : 'no'}</td></tr>
              <tr><td class="muted">AI keys</td><td class="mono">
                {[form.openai && 'openai', form.anthropic && 'anthropic', form.google && 'google', form.deepseek && 'deepseek'].filter(Boolean).join(', ') || 'none'}
              </td></tr>
              <tr><td class="muted">SMTP</td><td class="mono">{form.smtpUser} @ {form.smtpHost}:{form.smtpPort}</td></tr>
            </tbody>
          </table>
        </div>
      {/if}
    </div>

    <div class="modal-foot">
      {#if step > 1}
        <button class="btn ghost" on:click={() => (step -= 1)} disabled={busy}>Back</button>
      {/if}
      {#if step < 6}
        <button class="btn solid" on:click={() => (step += 1)}
          disabled={step === 1 ? !form.slug.trim() : step === 2 ? !form.host.trim() : false}>Next</button>
      {:else}
        <button class="btn solid" on:click={saveAndLaunch} disabled={busy}>{busy ? 'Launching…' : 'Save & launch'}</button>
      {/if}
    </div>

    <div style="padding:0 16px 12px;">
      {#if status}<p class="ok small">{status}</p>{/if}
      {#if progress.length}
        <ol class="progress">
          {#each progress as p, i}
            <li class:done={stepDone(i)} class:err={p.stage === 'error'}>
              <span class="mark">
                {#if p.stage === 'error'}✕
                {:else if stepDone(i)}✓
                {:else}<span class="pulse">●</span>{/if}
              </span>
              <span class="plabel">{p.label}</span>
            </li>
          {/each}
        </ol>
      {/if}
      {#if error}<p class="error small">{error}</p>{/if}
    </div>
  </div>
</div>

<style>
  .modal-backdrop { position: fixed; inset: 0; background: rgba(4,6,12,0.7); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; }
  .modal { background: var(--panel-2); border: 1px solid var(--line); border-radius: 14px; width: min(760px, 92vw); max-height: 88vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 80px rgba(0,0,0,0.45); }
  .modal.wide { width: min(920px, 96vw); }
  .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--line-soft); }
  .modal-body { padding: 18px; overflow-y: auto; }
  .modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 12px 16px; border-top: 1px solid var(--line-soft); }
  .x { background: transparent; border: 0; color: var(--ink-faint); font-size: 18px; cursor: pointer; }
  .check-label { display: inline-flex; align-items: center; gap: 6px; color: var(--ink-dim); }
  .progress { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 4px; max-height: 220px; overflow-y: auto; }
  .progress li { display: flex; align-items: baseline; gap: 8px; font-size: 12px; color: var(--ink-dim); }
  .progress .mark { width: 14px; text-align: center; color: var(--ink-faint); flex: none; }
  .progress li.done .mark { color: var(--good); }
  .progress li.done .plabel { color: var(--ink); }
  .progress li.err .mark, .progress li.err .plabel { color: var(--danger); }
  .progress .plabel { font-family: var(--mono); }
  .pulse { animation: pulse 1.2s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
</style>
