<script lang="ts">
  export let points: number[] = [];
  export let height = 60;
  export let width = 280;
  export let color = 'var(--signal)';
  export let unit = '';
  export let label = '';

  $: max = points.length ? Math.max(...points, 1) : 1;
  $: min = points.length ? Math.min(...points, 0) : 0;
  $: range = max - min || 1;
  $: coords = points.map((v, i) => {
    const x = points.length > 1 ? (i / (points.length - 1)) * width : width / 2;
    const y = height - ((v - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  $: path = coords.join(' ');
  $: last = points.length ? points[points.length - 1] : null;
</script>

<div class="chart">
  <div class="chart-head">
    <span class="faint small">{label}</span>
    {#if last !== null}<span class="mono small">{last.toFixed(1)}{unit}</span>{/if}
  </div>
  {#if points.length > 1}
    <svg viewBox="0 0 {width} {height}" preserveAspectRatio="none" class="chart-svg">
      <polyline points={path} fill="none" stroke={color} stroke-width="2" vector-effect="non-scaling-stroke" />
    </svg>
  {:else}
    <p class="faint small" style="margin:0;">Not enough data yet — check back after a few heartbeats.</p>
  {/if}
</div>

<style>
  .chart { display: flex; flex-direction: column; gap: 4px; }
  .chart-head { display: flex; align-items: baseline; justify-content: space-between; }
  .chart-svg { width: 100%; height: 60px; display: block; }
</style>
