# CORTEX Embedding Migration Guide

This guide explains how to populate CORTEX's vector database with embeddings from existing patterns stored in MongoDB.

## Overview

The CORTEX migration script (`scripts/migrate-cortex-embeddings.js`) performs the following operations:

1. **Fetches patterns** from MongoDB's `cortex_patterns` collection
2. **Generates embeddings** for each pattern using OpenAI's text-embedding-3-large model
3. **Stores vectors** in Qdrant (vector database) for semantic similarity search
4. **Creates nodes** in Neo4j (graph database) for pattern relationships
5. **Builds relationships** between patterns based on alternatives and dependencies

## Prerequisites

Before running the migration, ensure:

1. **CORTEX is configured** via the Admin panel (`/admin` → CORTEX Brain tab)
   - Vector DB (Qdrant) is running and configured
   - Graph DB (Neo4j) is running and configured
   - Document DB (MongoDB) contains existing patterns
   - Embedding Service has a valid OpenAI API key

2. **All CORTEX services are online** (check health status in Admin panel)

3. **You have existing patterns** in MongoDB's `cortex_patterns` collection

## Usage

### Basic Migration

Run the migration script with default settings:

```bash
node scripts/migrate-cortex-embeddings.js
```

This will:
- Process all patterns from MongoDB
- Generate embeddings in batches of 10
- Store results in both Qdrant and Neo4j
- Display progress and statistics

### Command Line Options

#### Dry Run Mode

Test the migration without writing to databases:

```bash
node scripts/migrate-cortex-embeddings.js --dry-run
```

Use this to:
- Verify patterns can be processed
- Estimate token usage and cost
- Test connectivity to all services

#### Batch Size

Control how many patterns are processed concurrently:

```bash
node scripts/migrate-cortex-embeddings.js --batch-size=20
```

- **Default**: 10 patterns per batch
- **Smaller batches** (5-10): Safer for rate limiting, slower overall
- **Larger batches** (20-50): Faster overall, may hit rate limits

#### Skip Existing

Skip patterns that already have embeddings:

```bash
node scripts/migrate-cortex-embeddings.js --skip-existing
```

Useful for:
- Resuming interrupted migrations
- Adding new patterns without re-processing old ones
- Incremental updates

#### Domain Filter

Migrate only patterns from a specific domain:

```bash
node scripts/migrate-cortex-embeddings.js --domain=goal_understanding
```

Common domains:
- `goal_understanding`
- `capability_discovery`
- `pipeline_planning`
- `pipeline_construction`
- `gap_analysis`
- `execution_validation`
- `analysis_improvement`

### Combined Options

Example combining multiple options:

```bash
node scripts/migrate-cortex-embeddings.js \
  --batch-size=15 \
  --skip-existing \
  --domain=goal_understanding
```

## Migration Process

### Phase 1: Initialization

```
╔═══════════════════════════════════════════════════════════╗
║         CORTEX Embedding Migration Script                ║
╚═══════════════════════════════════════════════════════════╝

📋 Configuration:
   Batch size: 10
   Skip existing: false

⚙️  Loading CORTEX configuration...
🔌 Connecting to CORTEX services...
   ✓ Vector DB (Qdrant) connected
   ✓ Graph DB (Neo4j) connected
   ✓ Embedding service initialized
```

### Phase 2: Pattern Fetching

```
📥 Fetching patterns from MongoDB...
   Found 156 pattern(s)
```

### Phase 3: Batch Processing

```
🔄 Processing patterns in batches of 10...

📦 Batch 1/16 (patterns 1-10):
   🧠 Generating embedding for pattern a1b2c3d4...
   🧠 Generating embedding for pattern e5f6g7h8...
   ...
   Batch complete: 10 processed, 0 skipped, 0 failed

   ⏳ Waiting 2 seconds before next batch...
```

### Phase 4: Completion

```
╔═══════════════════════════════════════════════════════════╗
║                   Migration Complete                      ║
╚═══════════════════════════════════════════════════════════╝

📊 Statistics:
   Total patterns:         156
   Processed:              156 (100.0%)
   Skipped:                0
   Failed:                 0

   Embeddings generated:   156
   Vectors stored:         156
   Graph nodes created:    156
   Graph relationships:    23

   Total tokens used:      45,230
   Total cost:             $0.0059
   Duration:               127.3s

✅ Migration completed successfully!
```

## Cost Estimation

The migration uses OpenAI's **text-embedding-3-large** model:

- **Model**: text-embedding-3-large
- **Dimensions**: 3072
- **Pricing**: $0.13 per 1M tokens

### Example Costs

| Patterns | Avg Tokens/Pattern | Total Tokens | Cost    |
|----------|-------------------|--------------|---------|
| 100      | 300               | 30,000       | $0.0039 |
| 500      | 300               | 150,000      | $0.0195 |
| 1,000    | 300               | 300,000      | $0.0390 |
| 5,000    | 300               | 1,500,000    | $0.1950 |

Use `--dry-run` to get an exact cost estimate before running the actual migration.

## Troubleshooting

### "CORTEX configuration not found"

**Problem**: No CORTEX configuration exists.

**Solution**: Configure CORTEX in the Admin panel first:
1. Go to `/admin`
2. Click "CORTEX Brain" tab
3. Configure all four services
4. Test connections
5. Save configuration

### "Vector DB connection failed"

**Problem**: Qdrant is not running or misconfigured.

**Solution**:
1. Ensure Qdrant is running: `docker ps | grep qdrant`
2. Verify host/port in CORTEX config
3. Test connection in Admin panel
4. Check Qdrant logs: `docker logs qdrant`

### "Graph DB connection failed"

**Problem**: Neo4j is not running or misconfigured.

**Solution**:
1. Ensure Neo4j is running: `docker ps | grep neo4j`
2. Verify URI/credentials in CORTEX config
3. Test connection in Admin panel
4. Check Neo4j logs: `docker logs neo4j`

### "Embedding service failed"

**Problem**: Invalid or missing OpenAI API key.

**Solution**:
1. Verify API key is set in CORTEX config
2. Check API key is valid: `curl https://api.openai.com/v1/models -H "Authorization: Bearer YOUR_KEY"`
3. Ensure sufficient API credits

### Rate Limiting

**Problem**: OpenAI API rate limits exceeded.

**Solution**:
1. Reduce batch size: `--batch-size=5`
2. The script already includes 2-second delays between batches
3. For large migrations, run in multiple sessions with `--skip-existing`

### Partial Migration Failed

**Problem**: Migration stopped partway through.

**Solution**:
1. Re-run with `--skip-existing` flag
2. Only new patterns will be processed
3. Existing embeddings won't be regenerated

## Verifying Migration

### Check Vector DB

Use the Qdrant UI or API:

```bash
curl http://localhost:6333/collections/cortex_patterns
```

Expected response should show collection with points equal to migrated patterns.

### Check Graph DB

Use Neo4j Browser at `http://localhost:7474`:

```cypher
MATCH (p:Pattern) RETURN count(p)
```

Should return count of migrated patterns.

### Check CORTEX Health

In the Admin panel:
1. Go to `/admin`
2. Click "CORTEX Brain" tab
3. Check all components show "online" status
4. Click "Refresh Status" to verify

## Re-running Migration

It's safe to re-run the migration script multiple times:

1. **With `--skip-existing`**: Only new patterns are processed
2. **Without `--skip-existing`**: All patterns are re-embedded (vectors are updated)

Use case: After adding many new patterns, run with `--skip-existing` to only process new ones.

## Performance Tips

1. **Batch Size**: Start with 10, increase to 20-30 if no rate limiting occurs
2. **Domain Filtering**: Migrate critical domains first (e.g., `goal_understanding`)
3. **Dry Run First**: Always test with `--dry-run` to estimate time and cost
4. **Monitor Progress**: Watch for failed patterns in batch summaries
5. **Off-Peak Hours**: Run during off-peak hours to minimize impact

## Next Steps

After migration completes:

1. **Verify Embeddings**: Check Admin panel for CORTEX health
2. **Test Semantic Search**: Run a MAESTRO orchestration to test pattern retrieval
3. **Monitor Performance**: Watch for improved pattern matching in workflows
4. **Regular Updates**: Re-run migration periodically to add new patterns

## Support

For issues with CORTEX migration:
1. Check CORTEX health status in Admin panel
2. Review migration script output for specific errors
3. Verify all database services are running
4. Check database logs for connection issues
