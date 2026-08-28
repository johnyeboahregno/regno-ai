<script lang="ts">
  // Regno AI logo — uses the provided PNG assets in /static.
  // variant: 'light' (logov2.png, for dark backgrounds) | 'dark' (logov2_BLK.png, for light backgrounds)
  export let variant: 'light' | 'dark' = 'light';
  export let height = 22;

  const src = variant === 'dark' ? '/logov2_BLK.png' : '/logov2.png';
</script>

<img class="logo" src={src} alt="Regno AI" {height} />

<style>
  .logo {
    display: block;
    width: auto;
  }
</style>
