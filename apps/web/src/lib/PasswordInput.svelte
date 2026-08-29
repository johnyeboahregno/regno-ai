<script lang="ts">
  export let value = '';
  export let id = 'password';
  export let autocomplete: 'current-password' | 'new-password' = 'current-password';
  export let required = true;
  export let minlength: number | undefined = undefined;
  export let label = 'Password';

  let show = false;

  function onInput(e: Event) {
    value = (e.currentTarget as HTMLInputElement).value;
  }
</script>

<div class="pw-wrap">
  <input
    class="input pw-input"
    {id}
    type={show ? 'text' : 'password'}
    value={value}
    on:input={onInput}
    {required}
    {autocomplete}
    {minlength}
    aria-label={label}
  />
  <button
    type="button"
    class="eye"
    on:click={() => (show = !show)}
    aria-label={show ? 'Hide password' : 'Show password'}
    aria-pressed={show}
  >
    {#if show}
      <svg
        width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      >
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    {:else}
      <svg
        width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    {/if}
  </button>
</div>

<style>
  .pw-wrap { position: relative; }
  .pw-input { padding-right: 46px; }
  .eye {
    position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
    display: flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; border: 0; background: transparent;
    color: var(--ink-faint); cursor: pointer; border-radius: 8px;
    transition: color 0.15s ease, background 0.15s ease;
  }
  .eye:hover { color: var(--ink); background: var(--panel-2); }
  .eye:focus-visible { outline: 1px solid var(--signal); }
</style>
