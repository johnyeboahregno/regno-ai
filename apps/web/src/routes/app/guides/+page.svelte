<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { guides } from '$lib/guides';

  onMount(() => {
    const first = guides[0];
    if (first) void goto(`/app/guides/${first.slug}`, { replaceState: true });
  });
</script>

<div class="page-head">
  <div class="eyebrow blue">Knowledge</div>
  <h1>User Guides</h1>
  <p>Choose a guide from the sidebar.</p>
</div>

