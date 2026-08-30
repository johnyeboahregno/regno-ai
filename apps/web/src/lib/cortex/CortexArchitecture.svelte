<script lang="ts">
  // Static view of the CORTEX architecture (from docs/architecture/CORTEX_KNOWLEDGE_SYSTEM_ARCHITECTURE.md).
  const layers = [
    {
      title: 'Knowledge Ingestion',
      tone: 'signal',
      items: ['URLs', 'PDFs', 'Images', 'Research papers', 'API feeds'],
    },
    {
      title: 'Extraction Engine',
      tone: 'signal',
      items: ['Entity extraction', 'Relationship mapping', 'Concept linking', 'Summary generation'],
    },
    {
      title: 'Staging & Validation',
      tone: 'amber',
      items: [
        'ZSTD-compressed staging',
        'Quality gateway — score ≥ 80 promote · 50–79 re-enrich · < 50 review',
        'Three-tier quality scoring & quarantine',
      ],
    },
    {
      title: 'Knowledge Storage',
      tone: 'good',
      items: [
        'MongoDB — documents & full-text (source of truth)',
        'Qdrant — semantic vectors',
        'Neo4j — entities, relationships & paths',
      ],
    },
    {
      title: 'Reasoning — CORTEX Brain',
      tone: 'signal',
      items: [
        'Semantic search (Qdrant) → graph traversal (Neo4j) → document retrieval (Mongo)',
        'LLM reasoning synthesis',
        'Citation & confidence scoring',
      ],
    },
  ];
</script>

<div class="arch">
  {#each layers as layer, i}
    <div class="layer" style={`--tone: var(--${layer.tone});`}>
      <div class="layer-head">
        <span class="idx">{i + 1}</span>
        <span>{layer.title}</span>
      </div>
      <ul>
        {#each layer.items as item}
          <li>{item}</li>
        {/each}
      </ul>
    </div>
    {#if i < layers.length - 1}
      <div class="arrow">↓</div>
    {/if}
  {/each}
</div>

<style>
  .arch { max-width: 760px; }
  .layer {
    border: 1px solid var(--line);
    border-left: 3px solid var(--tone);
    border-radius: var(--r);
    background: var(--panel);
    padding: 16px 20px;
  }
  .layer-head {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: var(--display);
    font-size: 15px;
    font-weight: 700;
    color: var(--ink);
    margin-bottom: 10px;
  }
  .idx {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: color-mix(in srgb, var(--tone) 18%, transparent);
    color: var(--tone);
    font-family: var(--mono);
    font-size: 12px;
  }
  ul { margin: 0; padding-left: 18px; }
  li { color: var(--ink-dim); font-size: 13.5px; margin: 4px 0; }
  .arrow {
    text-align: center;
    color: var(--ink-faint);
    font-family: var(--mono);
    padding: 2px 0;
    margin: 2px 0;
  }
</style>
