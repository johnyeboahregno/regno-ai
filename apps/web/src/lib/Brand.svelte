<script lang="ts">
  // Regno AI logo — uses the provided PNG assets in /static.
  // variant: 'light' (logov2.png, for dark backgrounds) | 'dark' (logov2_BLK.png, for light backgrounds).
  // 'auto' (default) picks the correct one for the active theme.
  import { theme } from '$lib/ui';

  export let variant: 'light' | 'dark' | 'auto' = 'auto';
  export let height = 22;

  $: resolved = variant === 'auto' ? ($theme === 'light' ? 'dark' : 'light') : variant;
  $: src = resolved === 'dark' ? '/logov2_BLK.png' : '/logov2.png';
</script>

<img class="logo" src={src} alt="Regno AI" {height} />

<style>
  .logo {
    display: block;
    width: auto;
  }
</style>
