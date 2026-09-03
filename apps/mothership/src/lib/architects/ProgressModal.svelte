<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';

  export let slug: string;
  export let jobId: string | undefined = undefined;

  const dispatch = createEventDispatcher();

  let progress: Array<{ stage: string; label: string; at: string }> = [];
  let phase: 'running' | 'done' | 'error' = 'running';
  let statusError: string | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;

  async function poll() {
    try {
      const r = await fetch(`/api/architects/${slug}`);
      const d = await r.json();
      if (d.ok) {
        if (Array.isArray(d.architect.progress)) progress = d.architect.progress;
        statusError = d.architect.error ?? null;
        if (d.architect.status === 'healthy') phase = 'done';
        else if (d.architect.status === 'error') phase = 'error';
        if (d.architect.status === 'healthy' || d.architect.status === 'error') {
          if (timer) clearInterval(timer);
          timer = null;
        }
      }
    } catch {
      /* keep polling */
    }
  }

  function stepDone(i: number): boolean {
    if (phase === 'done') return true;
    if (phase === 'error' && i === progress.length - 1) return false;
    return i < progress.length - 1;
  }

  function close() {
    dispatch('close');
  }

  onMount(() => {
    poll();
    timer = setInterval(poll, 2000);
  });

  onDestroy(() => {
    if (timer) clearInterval(timer);
  });
</script>

<div class="modal-backdrop" on:click={close}>
  <div class="modal" role="dialog" aria-modal="true" aria-label="Deployment progress" on:click|stopPropagation>
    <div class="modal-head">
      <span class="eyebrow blue">Redeploying <span class="mono">{slug}</span></span>
      <button class="x" on:click={close}>✕</button>
    </div>
    <div class="modal-body">
      {#if jobId}<p class="faint small">Job {jobId}</p>{/if}
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
      {:else}
        <p class="faint small">Waiting for progress…</p>
      {/if}
      {#if phase === 'error' && statusError}<p class="error small">{statusError}</p>{/if}
      {#if phase === 'done'}<p class="ok small">Deployed successfully.</p>{/if}
    </div>
    <div class="modal-foot">
      <button class="btn ghost" on:click={close}>{phase === 'running' ? 'Run in background' : 'Close'}</button>
    </div>
  </div>
</div>

<style>
  .modal-backdrop { position: fixed; inset: 0; background: rgba(4,6,12,0.7); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; }
  .modal { background: var(--panel-2); border: 1px solid var(--line); border-radius: 14px; width: min(560px, 92vw); max-height: 80vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 80px rgba(0,0,0,0.45); }
  .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--line-soft); }
  .modal-body { padding: 18px; overflow-y: auto; }
  .modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 12px 16px; border-top: 1px solid var(--line-soft); }
  .x { background: transparent; border: 0; color: var(--ink-faint); font-size: 18px; cursor: pointer; }
  .progress { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; max-height: 320px; overflow-y: auto; }
  .progress li { display: flex; align-items: baseline; gap: 8px; font-size: 12px; color: var(--ink-dim); }
  .progress .mark { width: 14px; text-align: center; color: var(--ink-faint); flex: none; }
  .progress li.done .mark { color: var(--good); }
  .progress li.done .plabel { color: var(--ink); }
  .progress li.err .mark, .progress li.err .plabel { color: var(--danger); }
  .progress .plabel { font-family: var(--mono); }
  .pulse { animation: pulse 1.2s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
</style>
