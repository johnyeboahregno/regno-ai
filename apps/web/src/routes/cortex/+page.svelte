<script lang="ts">
  import CortexPage from '$lib/cortex/CortexPage.svelte';
</script>

<svelte:head><title>CORTEX — Regno AI</title></svelte:head>

<div class="topnav">
  <a class="brand" href="/">Regno AI</a>
  <a class="btn ghost" href="/login">Sign in</a>
</div>

<div class="wrap" style="padding-top:32px; padding-bottom:80px;">
  <CortexPage />
</div>

<style>
  .topnav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: var(--maxw);
    margin: 0 auto;
    padding: 20px 32px;
  }
  .brand {
    font-family: var(--display);
    font-weight: 800;
    font-size: 17px;
    letter-spacing: -0.01em;
    background: linear-gradient(135deg, var(--signal), var(--signal-2));
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
</style>
