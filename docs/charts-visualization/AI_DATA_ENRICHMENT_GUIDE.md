# AI-Driven Data Enrichment Guide

## Overview
The system supports MongoDB `$lookup` enrichment to replace IDs with human-readable names. This should be configured dynamically by AI agents through schema discovery, **NOT hard-coded**.

## How AI Agents Should Configure Enrichment

### Step 1: Analyze Source Collection
AI agents should examine the source collection to identify:
- Fields containing IDs (look for patterns: `*Id`, `*DocId`, `*Ref`)
- Sample documents to understand the data structure
- Field types and naming conventions

### Step 2: Discover Reference Collections
Query the database to:
- List all available collections
- Sample documents from potential reference collections
- Identify collections that contain human-readable names/descriptions

### Step 3: Match ID Fields to Reference Collections
Determine which ID fields can be enriched by:
- Matching field name patterns (e.g., `paramDefDocId` → `ParamDefDoc`)
- Querying reference collections to verify ID existence
- Identifying name/description fields in reference collections

### Step 4: Generate Enrichment Configuration
Create a `LookupConfig` object:

```javascript
{
  enrichment: {
    enabled: true,
    fromCollection: "ReferenceCollectionName",  // Discovered collection name
    localField: "idFieldName",                  // ID field in source data
    foreignField: "_id",                        // Match field (usually '_id')
    nameField: "displayName",                   // Human-readable name field
    descriptionField: "description"             // Optional description field
  }
}
```

## DataSource Node Configuration

Add enrichment config to the DataSource node's config object:

```javascript
{
  sourceType: "mongodb",
  database: "mydb",
  collection: "SampleData",
  aggregationStrategy: "auto",
  enrichment: {
    enabled: true,
    fromCollection: "ParameterDefinitions",
    localField: "parameterId",
    foreignField: "_id",
    nameField: "name",
    descriptionField: "description"
  }
}
```

## Insight Node Integration

The Insight node automatically uses enriched data if available:
- If `categoryName` field exists → use it for display
- Falls back to raw ID if enrichment not available
- No configuration needed in Insight node

## System Prompt Template for AI Agents

When configuring DataSource nodes, AI agents should:

```
1. EXAMINE the source collection schema
2. IDENTIFY ID fields that reference other collections
3. DISCOVER available reference collections
4. VERIFY that reference collections contain name/description fields
5. GENERATE appropriate enrichment configuration
6. ADD the configuration to the node config
```

## Example Workflow

**User Request**: "Analyze ParamSamplesDoc and show human-readable parameter names"

**AI Agent Actions**:
1. Query `ParamSamplesDoc` schema → finds `paramDefDocId` field
2. List collections → finds `ParamDefDoc` collection
3. Sample `ParamDefDoc` → finds `name` and `description` fields
4. Configure DataSource node with enrichment:
   ```javascript
   {
     enrichment: {
       enabled: true,
       fromCollection: "ParamDefDoc",
       localField: "paramDefDocId",
       foreignField: "_id",
       nameField: "name",
       descriptionField: "description"
     }
   }
   ```

## Benefits of AI-Driven Approach

- **No Hard-Coding**: Works with any database schema
- **Discoverable**: AI can explore and understand new schemas
- **Flexible**: Supports any collection/field names
- **Maintainable**: Schema changes don't require code updates
- **Intelligent**: AI can suggest optimal enrichment strategies

## Implementation Notes

- Enrichment is optional - system works without it
- Performance impact: `$lookup` adds overhead, but improves UX
- Can enrich multiple fields by chaining configurations
- Works with both raw and time-bucketed aggregations
