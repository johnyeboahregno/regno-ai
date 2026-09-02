<script lang="ts">
  // Regno AI logo — assets are bundled with the package (imported via Vite).
  // variant: 'light' (for dark backgrounds) | 'dark' (for light backgrounds).
  // 'auto' (default) picks the correct one for the active theme.
  import { theme } from './ui';
  import lightLogo from './assets/logov2.png';
  import darkLogo from './assets/logov2_BLK.png';

  export let variant: 'light' | 'dark' | 'auto' = 'auto';
  export let height = 22;

  $: resolved = variant === 'auto' ? ($theme === 'light' ? 'dark' : 'light') : variant;
  $: src = resolved === 'dark' ? darkLogo : lightLogo;
</script>

<img class="logo" src={src} alt="Regno AI" {height} />

<style>
  .logo {
    display: block;
    width: auto;
  }
</style>
