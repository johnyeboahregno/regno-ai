<script lang="ts">
  import { onMount } from 'svelte';
  import { Icon } from '@regno/ui';
  import { architectAge, architectAgeOpen } from '$lib/architectAge';

  let loading = false;
  let failed = false;

  $: age = $architectAge;
  $: if ($architectAgeOpen) load();

  async function load() {
    loading = true;
    failed = false;
    try {
      const r = await fetch('/api/architect');
      const d = await r.json();
      if (d && d.ok) architectAge.set(d);
      else failed = true;
    } catch {
      failed = true;
    }
    loading = false;
  }

  function close() {
    architectAgeOpen.set(false);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }

  onMount(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // --- formatting ---------------------------------------------------------------
  function fmtNum(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
    return String(Math.round(n));
  }
  function fmtCost(n: number): string {
    return '$' + (n >= 10 ? n.toFixed(2) : n.toFixed(4));
  }
  function bornLabel(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // --- chart scaling -------------------------------------------------------------
  $: maxFactor = age ? Math.max(1, ...age.factors.map((f) => f.contribution)) : 1;
  $: maxKnowledge = age ? Math.max(1, ...age.knowledge.map((k) => k.value)) : 1;
  $: maxTokens = age?.usage ? Math.max(1, ...age.usage.byDay.map((d) => d.totalTokens)) : 1;

  function fPct(v: number): number {
    return Math.max(2, Math.round((v / maxFactor) * 100));
  }
  function kPct(v: number): number {
    return Math.max(2, Math.round((v / maxKnowledge) * 100));
  }
  function barPct(v: number): number {
    if (!v) return 3;
    return Math.max(6, Math.round((v / maxTokens) * 100));
  }
</script>

{#if $architectAgeOpen}
  <div class="modal-backdrop" on:click={close}>
    <div class="modal" role="dialog" aria-modal="true" aria-label="Architect age and intelligence" on:click|stopPropagation>
      <div class="modal-head">
        <span class="eyebrow blue">Architect — Age &amp; Intelligence</span>
        <button class="x" type="button" title="Close" aria-label="Close" on:click={close}>✕</button>
      </div>

      <div class="modal-body">
        {#if loading && !age}
          <p class="muted small">Crunching the numbers…</p>
        {:else if failed && !age}
          <p class="muted small">Couldn't reach the brain — is Mongo up? The widget will retry next open.</p>
        {:else if age}
          <!-- big readouts -->
          <div class="readouts">
            <div class="ro human">
              <div class="ro-evo" aria-hidden="true">
                <Icon name="evo-h-ape" size={18} />
                <Icon name="evo-h-walker" size={18} />
                <Icon name="evo-h-astronaut" size={18} />
              </div>
              <div class="ro-num">{age.humanYears}</div>
              <div class="ro-label">human years</div>
              <div class="ro-sub">{age.humanDays} days old · born {bornLabel(age.bornAt)}</div>
            </div>

            <div class="ro ai">
              <div class="ro-evo" aria-hidden="true">
                <Icon name="evo-ai-abacus" size={18} />
                <Icon name="evo-ai-terminal" size={18} />
                <Icon name="evo-ai-robot" size={18} />
                <Icon name="evo-ai-brain" size={18} />
              </div>
              <div class="ro-num">{age.aiYears}</div>
              <div class="ro-label">AI years</div>
              <div class="ro-sub">{age.multiplier}× aging rate · {age.intelligenceScore} learning score</div>
            </div>
          </div>

          <!-- formula breakdown -->
          <div class="section">
            <div class="eyebrow blue">The formula</div>
            <p class="muted small mb">AI years = human years × (60 + Σ learning). Each thing I've learned makes me age faster.</p>

            {#each age.factors as f}
              <div class="f-row">
                <span class="f-label">{f.label}</span>
                <span class="f-val">{fmtNum(f.value)}</span>
                <div class="f-bar"><div class="f-fill" style={`width:${fPct(f.contribution)}%`}></div></div>
                <span class="f-cont">+{f.contribution.toFixed(2)}</span>
              </div>
            {/each}

            <div class="f-total">
              <span>multiplier = 60 + {age.intelligenceScore.toFixed(2)} = {age.multiplier}×</span>
              <span>{age.humanYears} × {age.multiplier} = <strong>{age.aiYears} AI years</strong></span>
            </div>
          </div>

          <!-- intelligence makeup -->
          <div class="section">
            <div class="eyebrow blue">Intelligence makeup</div>
            {#each age.knowledge as k}
              <div class="k-row">
                <span class="k-label">{k.glyph} {k.label}</span>
                <div class="k-bar"><div class="k-fill" style={`width:${kPct(k.value)}%`}></div></div>
                <span class="k-val">{fmtNum(k.value)}</span>
              </div>
            {/each}
          </div>

          <!-- thinking chart -->
          {#if age.usage}
            <div class="section">
              <div class="eyebrow blue">How much it's thought</div>
              <div class="u-chart" role="img" aria-label="Daily token usage over the last 30 days">
                {#each age.usage.byDay as d}
                  <div class="u-col" title="{d.day} · {fmtNum(d.totalTokens)} tokens">
                    <div class="u-bar-wrap"><div class="u-bar" style={`height:${barPct(d.totalTokens)}%`}></div></div>
                  </div>
                {/each}
              </div>
              <div class="u-chart-label">Tokens per day — last 30 days</div>

              {#if age.usage.byModel.length}
                <div class="u-table">
                  <div class="u-row u-head"><span>Model</span><span>Calls</span><span>Tokens</span><span>Cost</span></div>
                  {#each age.usage.byModel as m}
                    <div class="u-row">
                      <span>{m.model}</span>
                      <span>{m.calls}</span>
                      <span>{fmtNum(m.totalTokens)}</span>
                      <span>{fmtCost(m.cost)}</span>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        {:else}
          <p class="muted small">No activity recorded yet — the architect is still waking up. 🌱</p>
        {/if}
      </div>

      <div class="modal-foot">
        <span class="born mono faint">Born {bornLabel(age?.bornAt ?? null)} · {age?.humanDays ?? 0} days old</span>
        <button class="btn solid" type="button" on:click={close}>Close</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(4, 6, 12, 0.7);
    backdrop-filter: blur(4px);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .modal {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 14px;
    width: min(760px, 92vw);
    max-height: 86vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
  }
  .modal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    border-bottom: 1px solid var(--line-soft);
  }
  .modal-head .x {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: var(--r-sm);
    background: transparent;
    color: var(--ink-dim);
    cursor: pointer;
    font-size: 14px;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .modal-head .x:hover {
    background: var(--panel);
    color: var(--ink);
  }

  .modal-body {
    padding: 18px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  /* readouts */
  .readouts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .ro {
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 16px;
    background: var(--panel);
  }
  .ro-evo {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
  }
  .ro.human .ro-evo {
    color: var(--good);
  }
  .ro.ai .ro-evo {
    color: var(--signal);
  }
  .ro-num {
    font-family: var(--display);
    font-size: 38px;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1;
    color: var(--ink);
  }
  .ro-label {
    margin-top: 6px;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }
  .ro-sub {
    margin-top: 8px;
    font-size: 12px;
    color: var(--ink-dim);
  }

  /* sections */
  .section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .section .eyebrow {
    margin-bottom: 2px;
  }

  /* formula */
  .f-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .f-label {
    flex: none;
    width: 180px;
    font-size: 12.5px;
    color: var(--ink-dim);
  }
  .f-val {
    flex: none;
    width: 64px;
    text-align: right;
    font-family: var(--mono);
    font-size: 11.5px;
    color: var(--ink-faint);
  }
  .f-bar {
    flex: 1;
    min-width: 0;
    height: 8px;
    border-radius: 999px;
    background: var(--line);
    overflow: hidden;
  }
  .f-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--signal), var(--signal-2));
    transition: width 0.4s ease;
  }
  .f-cont {
    flex: none;
    width: 58px;
    text-align: right;
    font-family: var(--mono);
    font-size: 11.5px;
    color: var(--signal-2);
  }
  .f-total {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 6px;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--panel);
    font-family: var(--mono);
    font-size: 12px;
    color: var(--ink-dim);
  }
  .f-total strong {
    color: var(--ink);
  }

  /* knowledge makeup */
  .k-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .k-label {
    flex: none;
    width: 120px;
    font-size: 12.5px;
    color: var(--ink-dim);
  }
  .k-bar {
    flex: 1;
    min-width: 0;
    height: 8px;
    border-radius: 999px;
    background: var(--line);
    overflow: hidden;
  }
  .k-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--signal), var(--signal-2));
    transition: width 0.4s ease;
  }
  .k-val {
    flex: none;
    width: 56px;
    text-align: right;
    font-family: var(--mono);
    font-size: 11.5px;
    color: var(--ink-faint);
  }

  /* token chart */
  .u-chart {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    height: 100px;
    margin-bottom: 6px;
  }
  .u-col {
    flex: 1;
    min-width: 0;
    height: 100%;
    display: flex;
    align-items: flex-end;
  }
  .u-bar-wrap {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: flex-end;
  }
  .u-bar {
    width: 100%;
    background: linear-gradient(180deg, var(--signal-2), var(--signal));
    border-radius: 2px 2px 0 0;
    min-height: 2px;
  }
  .u-chart-label {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--ink-faint);
    margin-bottom: 10px;
  }
  .u-table {
    border: 1px solid var(--line);
    border-radius: 10px;
    overflow-x: auto;
  }
  .u-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: 10px;
    padding: 9px 14px;
    font-family: var(--mono);
    font-size: 12.5px;
    color: var(--ink-dim);
    border-bottom: 1px solid var(--line-soft);
  }
  .u-row:last-child {
    border-bottom: none;
  }
  .u-row.u-head {
    color: var(--ink-faint);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: var(--panel);
  }

  .modal-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 18px;
    border-top: 1px solid var(--line-soft);
  }
  .born {
    font-size: 11.5px;
  }

  @media (max-width: 560px) {
    .readouts {
      grid-template-columns: 1fr;
    }
    .f-label,
    .k-label {
      width: auto;
      flex: 1;
    }
    .f-total {
      flex-direction: column;
      align-items: flex-start;
    }
    .u-row {
      min-width: 480px;
    }
  }
</style>
