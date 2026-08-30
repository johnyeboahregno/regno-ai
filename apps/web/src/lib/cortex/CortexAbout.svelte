<script lang="ts">
  // About CORTEX — the "why" from the VISION card + architecture vision statement.
  const sections = [
    {
      label: 'Why this helps',
      body: "Regno.ai's structured knowledge substrate — Vector, Graph and Document stores plus quality-scored memory, all wired to a reasoning layer. Answers are drawn from verified, cross-referenced organisational knowledge — not a flat document dump.",
    },
    {
      label: 'Why it matters',
      bullets: [
        'Three database types working together catch what any single store would miss — by meaning, by relationship, and by exact record.',
        'Three-tier quality scoring and quarantine holds bad knowledge back before it reaches an answer.',
        'Cross-domain entity linking surfaces everything connected to a concept, even across separate systems.',
      ],
    },
    {
      label: 'Think of it like…',
      body: "Like a law firm's knowledge system where every document is graded, every name cross-referenced, and a senior analyst assembles the answer. e.g. A compliance query pulls semantically similar clauses, traces supplier entity links, and retrieves source records — one structured, auditable answer.",
    },
  ];
</script>

<div class="about">
  {#each sections as s}
    <div class="card">
      <div class="eyebrow blue">{s.label}</div>
      {#if s.body}<p class="muted mt">{s.body}</p>{/if}
      {#if s.bullets}
        <ul class="mt">
          {#each s.bullets as b}<li>{b}</li>{/each}
        </ul>
      {/if}
    </div>
  {/each}

  <div class="card highlight">
    <div class="eyebrow">Why Regno.ai is smarter</div>
    <p class="muted mt">
      General-purpose AI has no view into your private data and no way to grade which parts of it are
      reliable — CORTEX's quality scoring and quarantine do that job before any answer is formed.
    </p>
  </div>
</div>

<style>
  .about { max-width: 760px; display: grid; gap: 16px; }
  .highlight { background: var(--signal-bg); border-color: var(--signal); }
  ul { padding-left: 18px; }
  li { color: var(--ink-dim); font-size: 13.5px; margin: 5px 0; }
</style>
