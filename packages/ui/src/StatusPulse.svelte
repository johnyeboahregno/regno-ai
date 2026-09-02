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
  <path d="M2 12 L6 12 L9 3 L15 21 L18 12 L22 12" opacity="0.55" />
  <circle r="1.8" fill="currentColor" stroke="none" opacity="0">
    <animateMotion
      dur="1.6s"
      repeatCount="indefinite"
      path="M2 12 L6 12 L9 3 L15 21 L18 12 L22 12"
    />
    <animate
      attributeName="opacity"
      dur="1.6s"
      repeatCount="indefinite"
      values="0; 1; 1; 0"
      keyTimes="0; 0.12; 0.88; 1"
    />
  </circle>
</svg>
