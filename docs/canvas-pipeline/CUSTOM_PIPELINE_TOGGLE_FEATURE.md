# Custom Aggregation Pipeline Toggle Feature

## Overview
Added an **Enable/Disable toggle** for custom aggregation pipelines in data source nodes. This allows you to keep your custom pipeline JSON visible for reference even when disabled, making it easy to switch between custom pipelines and aggregation strategies.

---

## ✨ New Features

### 1. Pipeline Enable/Disable Toggle
- **Location**: Data Source configuration → Advanced: Custom Aggregation Pipeline section
- **Behavior**:
  - **✅ Enabled**: Custom pipeline is active, aggregation strategy is ignored
  - **⏸️ Disabled**: Custom pipeline is kept for reference only, aggregation strategy is used instead

### 2. Visual Feedback
- Dynamic status message shows current state
- Editor becomes read-only when disabled (preventing accidental edits)
- Help text updates based on toggle state

### 3. Backward Compatibility
- Existing pipelines with `pipeline` field automatically work (defaults to enabled)
- No breaking changes for existing configurations

---

## 🎯 Use Cases

### Keep Pipeline for Reference
```
Scenario: You have a complex custom pipeline with lookups
Action: Disable the toggle
Result: Pipeline JSON stays visible but isn't used
        Aggregation strategy (bucketed/smart) is used instead
```

### Switch Between Modes
```
During Development:
  - Test with aggregation strategy
  - Toggle on to test custom pipeline
  - Toggle off to compare results
  - Keep both configurations visible
```

### Documentation
```
Team Collaboration:
  - Keep custom pipeline as documentation
  - Show what the "advanced" version looks like
  - Easy to enable when needed for specific cases
```

---

## 📊 UI Changes

### Before
```
[Custom Pipeline JSON Editor]
└─ Always active if JSON is present
└─ No way to disable without deleting the JSON
```

### After
```
┌─────────────────────────────────────┐
│ [✓] Enable Custom Pipeline          │
│ ✅ Custom pipeline is active         │
└─────────────────────────────────────┘

💡 Tip: Keep your custom pipeline JSON here for reference

[Custom Pipeline JSON Editor]
├─ Can be enabled/disabled via toggle
├─ Stays visible when disabled
└─ Help text updates dynamically
```

---

## 🔧 Technical Implementation

### Frontend Changes
**File**: `src/lib/components/modal-sections/DataSourceConfigSection.svelte`

Added:
- Checkbox control bound to `editedConfig.pipelineEnabled`
- Dynamic status message with visual indicators
- Conditional help text based on toggle state
- Read-only mode when disabled

```svelte
<input
  type="checkbox"
  bind:checked={editedConfig.pipelineEnabled}
  class="w-4 h-4 text-blue-600 rounded"
/>
```

### Backend Changes
**File**: `src/lib/server/execution/pipelineGraphRunner.ts`

Modified the pipeline check (line ~2692):
```javascript
const pipelineEnabled = cfg.pipelineEnabled !== false; // Default true
if (pipelineRaw && !parsedPipeline && pipelineEnabled) {
  // Use custom pipeline
} else if (pipelineRaw && !pipelineEnabled) {
  console.log('Custom pipeline exists but is disabled');
  // Fall through to aggregation strategy
}
```

### Database Schema
New field in node config:
```javascript
{
  pipeline: "[...]",              // Custom aggregation pipeline JSON
  pipelineEnabled: true/false,    // NEW: Controls whether to use it
  aggregationStrategy: "smart",   // Used when pipeline disabled
  // ... other fields
}
```

---

## 📝 Configuration States

### State 1: Custom Pipeline Enabled
```javascript
{
  pipeline: "[{\"$match\": {...}}, ...]",
  pipelineEnabled: true,
  aggregationStrategy: "smart"  // IGNORED
}
```
**Behavior**: Uses custom pipeline, ignores strategy

### State 2: Custom Pipeline Disabled
```javascript
{
  pipeline: "[{\"$match\": {...}}, ...]",  // Kept for reference
  pipelineEnabled: false,
  aggregationStrategy: "smart"  // USED
}
```
**Behavior**: Uses aggregation strategy, pipeline kept for reference

### State 3: No Custom Pipeline
```javascript
{
  pipeline: null,
  pipelineEnabled: false,  // Irrelevant
  aggregationStrategy: "smart"  // USED
}
```
**Behavior**: Uses aggregation strategy

---

## 🎨 Visual Indicators

### Enabled State
```
┌───────────────────────────────────────────┐
│ [✓] Enable Custom Pipeline                │
│ ✅ Custom pipeline is active              │
│     aggregation strategy will be ignored  │
└───────────────────────────────────────────┘
```

### Disabled State
```
┌───────────────────────────────────────────┐
│ [ ] Enable Custom Pipeline                │
│ ⏸️ Custom pipeline is disabled            │
│     kept for reference only               │
└───────────────────────────────────────────┘
```

---

## 🔄 Migration

### For P-D3 Pipeline
The P-D3 pipeline has been updated:
```bash
node scripts/enable-p-d3-pipeline.js
```

This sets `pipelineEnabled: true` for the data source node.

### For Other Pipelines
Existing pipelines with custom pipelines will default to **enabled** (backward compatible).

To disable a custom pipeline programmatically:
```javascript
db.pipelines.updateOne(
  { name: "YourPipeline", "nodes.id": "node_id_here" },
  { $set: { "nodes.$.config.pipelineEnabled": false } }
);
```

---

## 💡 Best Practices

### 1. Document Complex Pipelines
Keep custom pipelines visible even when using aggregation strategies:
```
- Disable the toggle for day-to-day operations
- Keep the JSON as documentation
- Enable for specific use cases (detailed analysis, debugging)
```

### 2. A/B Testing
Compare results between custom pipeline and aggregation strategy:
```
1. Run with aggregation strategy (pipeline disabled)
2. Note the results
3. Enable custom pipeline
4. Compare performance and output
```

### 3. Development Workflow
```
Development:
  └─ Use aggregation strategy (fast, automatic)
  └─ Keep custom pipeline disabled

Production/Special Cases:
  └─ Enable custom pipeline for specific requirements
  └─ Example: Complex joins, specific optimizations
```

---

## 🐛 Troubleshooting

### Pipeline Not Being Used
**Symptom**: Custom pipeline JSON is present but not being executed

**Check**:
1. Is the toggle **enabled**? (checkbox should be checked)
2. Check browser console for: "Custom pipeline exists but is disabled"
3. Verify `pipelineEnabled: true` in database

### Pipeline Still Active After Disabling
**Symptom**: Custom pipeline still runs after unchecking toggle

**Solution**:
1. Save the node configuration
2. Refresh the browser page
3. Re-execute the pipeline

### Toggle Not Visible
**Symptom**: Can't find the enable/disable toggle

**Location**:
1. Open data source node configuration
2. Scroll to "Advanced: Custom Aggregation Pipeline"
3. Click to expand the section
4. Toggle is at the top in a blue box

---

## 📚 Related Documentation

- `P-D3_FIX_COMPLETE.md` - How custom pipelines are used in P-D3
- `AGGREGATION_STRATEGY_GUIDE.md` - Alternative to custom pipelines
- DataSource configuration documentation

---

## 🎯 Summary

**Problem Solved**: Users couldn't keep custom pipeline JSON for reference without it being active

**Solution**: Enable/Disable toggle that:
- ✅ Allows keeping JSON visible when disabled
- ✅ Makes it easy to switch between modes
- ✅ Provides clear visual feedback
- ✅ Maintains backward compatibility
- ✅ Prevents accidental edits when disabled

**Impact**: Better UX for managing complex aggregation pipelines while maintaining flexibility.
