<script lang="ts">
  // Animated system-status indicator — a small dot that travels along the heartbeat pulse.
  // Color is inherited via currentColor (set to --good by .sb-status in app.css).
  export let size = 16;
</script>

<svg
  viewBox="0 0 24 24"
  width={size}
  height={size}
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path d="M22 12 L18 12 L15 21 L9 3 L6 12 L2 12" opacity="0.55" />
  <circle r="1.8" fill="currentColor" stroke="none">
    <animateMotion
      dur="1.6s"
      repeatCount="indefinite"
      path="M22 12 L18 12 L15 21 L9 3 L6 12 L2 12"
    />
  </circle>
</svg>
