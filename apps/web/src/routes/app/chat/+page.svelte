<script lang="ts">
  import { onMount } from 'svelte';

  interface Msg {
    role: 'user' | 'assistant';
    text: string;
  }

  let messages: Msg[] = [];
  let input = '';
  let persona = 'base';
  let personas: Array<{ slug: string; name: string; developer: string }> = [
    { slug: 'base', name: 'Base Regno Architect', developer: 'base' },
  ];
  let busy = false;
  let error = '';

  async function send(e?: Event) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    messages = [...messages, { role: 'user', text }];
    input = '';
    busy = true;
    error = '';

    try {
      const developer = personas.find((p) => p.slug === persona)?.developer ?? 'base';
      const r = await fetch('/api/executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          settings: { forceAgent: 'regno-architect', analysisDepth: 'standard', developer },
        }),
      });
      const d = await r.json();
      if (!d.ok) {
        error = d.error ?? 'Failed to enqueue';
        busy = false;
        return;
      }

      const jobId = d.jobId;

      // Poll for the result (up to ~3 min).
      let result: { status?: string; output?: string; error?: string } | null = null;
      for (let i = 0; i < 90; i++) {
        await new Promise((res) => setTimeout(res, 2000));
        const rr = await fetch(`/api/executions/${jobId}`);
        const rd = await rr.json();
        if (rd.ok && rd.execution) {
          result = rd.execution;
          break;
        }
      }

      if (result?.status === 'complete') {
        messages = [...messages, { role: 'assistant', text: result.output || '(done — no output)' }];
      } else if (result?.status === 'failed') {
        messages = [...messages, { role: 'assistant', text: '⚠️ ' + (result.error || 'Execution failed') }];
      } else {
        messages = [
          ...messages,
          { role: 'assistant', text: '⚠️ No response yet — is the execution worker running and OPENAI_API_KEY set?' },
        ];
      }
    } catch {
      error = 'Failed to send — cannot reach the server.';
    } finally {
      busy = false;
    }
  }

  onMount(async () => {
    messages = [
      {
        role: 'assistant',
        text: 'I am your Regno Architect. Tell me what you want built and I will plan and execute it.',
      },
    ];
    try {
      const r = await fetch('/api/personas');
      const d = await r.json();
      if (d.ok && d.personas?.length) personas = d.personas;
    } catch {
      /* ignore */
    }
  });
</script>

<div class="chat">
  <div class="page-head">
    <div class="eyebrow blue">Regno Architect</div>
    <h1>Talk to your architect</h1>
    <p>Describe the work — the agent plans, builds, and learns.</p>
  </div>

  <div class="thread">
    {#each messages as m}
      <div class="msg {m.role}">
        <div class="bubble">{m.text}</div>
      </div>
    {/each}
    {#if busy}
      <div class="msg assistant">
        <div class="bubble working"><span class="dot signal"></span> working…</div>
      </div>
    {/if}
    {#if error}<p class="error">{error}</p>{/if}
  </div>

  <form class="composer" on:submit={send}>
    <div style="width:200px;">
      <label for="persona">Persona</label>
      <select class="input" id="persona" bind:value={persona}>
        {#each personas as p}
          <option value={p.slug}>{p.name}</option>
        {/each}
      </select>
    </div>
    <textarea
      class="input"
      bind:value={input}
      rows="2"
      placeholder="e.g. Build me a small notes API with auth…"
      on:keydown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          send();
        }
      }}
    ></textarea>
    <button class="btn solid" type="submit" disabled={busy}>{busy ? 'Working…' : 'Send'}</button>
  </form>
</div>

<style>
  .chat {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 80px);
    min-width: 0;
  }
  .thread {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 8px 0 16px;
  }
  .msg {
    display: flex;
  }
  .msg.user {
    justify-content: flex-end;
  }
  .bubble {
    max-width: 72%;
    padding: 12px 16px;
    border: 1px solid var(--line);
    border-radius: 12px;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 14.5px;
    line-height: 1.5;
  }
  .msg.user .bubble {
    background: var(--signal);
    border-color: var(--signal);
    color: #fff;
  }
  .msg.assistant .bubble {
    background: var(--panel);
    color: var(--ink);
  }
  .working {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--ink-dim);
    font-family: var(--mono);
    font-size: 13px;
  }
  .composer {
    display: flex;
    gap: 12px;
    align-items: flex-end;
    border-top: 1px solid var(--line);
    padding-top: 14px;
  }
  .composer textarea {
    flex: 1;
    resize: none;
  }
</style>
