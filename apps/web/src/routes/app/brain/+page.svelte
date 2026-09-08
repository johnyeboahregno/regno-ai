<script lang="ts">
</script>

<svelte:head><title>Cortex Brain — Regno</title></svelte:head>

<div class="brain-page">
  <div class="page-head">
    <div class="eyebrow">CORTEX</div>
    <h1>Cortex Brain</h1>
    <p>Hover a neuron or pathway to see what each region does and what flows between them.</p>
  </div>

  <iframe
    title="Cortex brain visualization"
    src="/cortex-brain.html"
    class="brain-frame"
    loading="eager"
  ></iframe>
</div>

<style>
  .brain-page {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 32px);
  }
  .brain-page .page-head { flex: none; }
  .brain-frame {
    flex: 1;
    width: 100%;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: transparent;
    min-height: 480px;
  }
</style>
