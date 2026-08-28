# P-D3 Pipeline: Category Names Enhancement

## Problem
The AI Insights report was showing cryptic category IDs like `YcVoRMs0lFRensXhpGoRJAvXQX3` instead of human-readable category names.

## Solution Applied
Updated the P-D3 pipeline configuration to enhance data with readable names at the source level using MongoDB $lookup operations.

---

## Changes Made

### 1. Data Source Node Enhancement
**Node:** `ParamSamplesDoc` (node_1762245156401_zsz22ond6)

**Changed From:**
- Simple filter + projection approach
- Only returned: `_id`, `startTime`, `endTime`, `min`, `max`, `configDocId`, `paramDefDocId`

**Changed To:**
- MongoDB aggregation pipeline with $lookup joins
- Joins with `ConfigDoc` collection to get config names
- Joins with `ParamDefDoc` collection to get parameter names and descriptions

**New Fields Added:**
- `configName` - Human-readable config name (from ConfigDoc.name)
- `paramName` - Human-readable parameter name (from ParamDefDoc.name)
- `paramDescription` - Parameter description (from ParamDefDoc.description)
- `categoryName` - Combined readable name: `"Config Name - Parameter Name"`
- `categoryId` - Original ID-based category (backward compatible)

**Aggregation Pipeline Structure:**
```javascript
[
  // 1. Filter documents
  { "$match": {
      "$and": [
        { "min": { "$ne": 0 } },
        { "max": { "$ne": 0 } },
        { "ai.processed": { "$ne": true } }
      ]
    }
  },

  // 2. Lookup ConfigDoc for config name
  { "$lookup": {
      "from": "ConfigDoc",
      "localField": "configDocId",
      "foreignField": "_id",
      "as": "configInfo"
    }
  },

  // 3. Lookup ParamDefDoc for parameter name
  { "$lookup": {
      "from": "ParamDefDoc",
      "localField": "paramDefDocId",
      "foreignField": "_id",
      "as": "paramInfo"
    }
  },

  // 4. Sort by startTime
  { "$sort": { "startTime": 1 } },

  // 5. Limit results
  { "$limit": 1000 },

  // 6. Project enhanced fields
  { "$project": {
      "_id": 1,
      "startTime": 1,
      "endTime": 1,
      "min": 1,
      "max": 1,
      "configDocId": 1,
      "paramDefDocId": 1,
      "configName": { "$arrayElemAt": ["$configInfo.name", 0] },
      "paramName": { "$arrayElemAt": ["$paramInfo.name", 0] },
      "paramDescription": { "$arrayElemAt": ["$paramInfo.description", 0] },
      "categoryName": {
        "$concat": [
          { "$ifNull": [{ "$arrayElemAt": ["$configInfo.name", 0] }, "Unknown Config"] },
          " - ",
          { "$ifNull": [{ "$arrayElemAt": ["$paramInfo.name", 0] }, "Unknown Param"] }
        ]
      },
      "categoryId": { "$concat": ["$configDocId", "|", "$paramDefDocId"] }
    }
  }
]
```

---

### 2. AI Insights Node Update
**Node:** `AI Insights` (node_1762198867771_m14w33yi5)

**Changes:**
- Updated `groupField` from `"category"` to `"categoryName"`
- Cleared previous output data to force regeneration

**Result:**
- AI Insights report now groups by readable names
- Categories in the report show as "Engine A - Temperature" instead of "YcVoRMs0lFRensXhpGoRJAvXQX3"

---

### 3. Chart Node Update
**Node:** `Chart` (node_1761251172118_nc4px9ull)

**Changes:**
- Updated `groupField` from `"configDocId|paramDefDocId"` to `"categoryName"`
- Enhanced tooltip template to show:
  - Category name (readable)
  - Timestamp
  - Min/Max/Value
  - Parameter description

**New Tooltip Template:**
```javascript
{
  template: '<div><strong>{category}</strong></div><div>{ts} => ({min} | {v} | {max})</div><div>{desc}</div>',
  placeholders: {
    category: '{categoryName}',
    ts: '{startTime}',
    v: '{value}',
    min: '{min}',
    max: '{max}',
    desc: '{paramDescription}'
  }
}
```

**Result:**
- Chart legend shows readable category names
- Tooltips display full context including descriptions

---

## Example Transformation

### Before:
**Category ID:** `YcVoRMs0lFRensXhpGoRJAvXQX3`
- Cryptic and meaningless to users
- No way to understand what this represents

### After:
**Category Name:** `"Main Reactor - Core Temperature"`
- Immediately understandable
- Shows both the config (Main Reactor) and parameter (Core Temperature)
- Includes description in tooltip

---

## Testing

When data is available in the collections, the pipeline will automatically:

1. **Data Source** fetches data with enhanced fields
2. **Chart** displays readable names in legend and tooltips
3. **AI Insights** groups analysis by readable names

### Manual Verification:
1. Open the P-D3 pipeline in the UI
2. Execute the pipeline
3. Check the AI Insights report - categories should now show readable names
4. Check the Chart legend - should display "Config - Parameter" format
5. Hover over chart points - tooltip should show full details

---

## Scripts Created

### 1. `fix-p-d3-category-names.js`
Updates the data source with MongoDB aggregation pipeline

### 2. `update-p-d3-insights-category.js`
Updates AI Insights to use categoryName field

### 3. `update-p-d3-chart-category.js`
Updates Chart to use categoryName for grouping

### 4. `verify-p-d3-enhanced-data.js`
Verifies the enhanced data output (requires data in collections)

---

## Benefits

✅ **Improved Readability** - Users see "Engine A - Temperature" instead of IDs
✅ **Better Insights** - AI analysis groups by meaningful categories
✅ **Enhanced Tooltips** - Chart shows full context with descriptions
✅ **Maintainability** - Changes are at the data source level, affecting all downstream consumers
✅ **Performance** - Lookups happen once at the source, not repeatedly downstream
✅ **Backward Compatible** - Original `categoryId` field preserved for any legacy integrations

---

## Next Steps

1. Ensure `ConfigDoc` and `ParamDefDoc` collections have data
2. Run the P-D3 pipeline with actual data
3. Verify the AI Insights report shows readable category names
4. Check the Chart legend for readable labels

---

## Database Requirements

The enhancement requires:
- `ParamSamplesDoc` collection with documents
- `ConfigDoc` collection with config definitions
- `ParamDefDoc` collection with parameter definitions

**Expected Schema:**
- `ParamSamplesDoc.configDocId` → `ConfigDoc._id`
- `ParamSamplesDoc.paramDefDocId` → `ParamDefDoc._id`
- `ConfigDoc.name` - Human-readable config name
- `ParamDefDoc.name` - Human-readable parameter name
- `ParamDefDoc.description` - Optional parameter description

---

## Rollback

If needed, the changes can be reverted by:
1. Restoring the data source to use simple filter/projection
2. Changing AI Insights `groupField` back to `"category"`
3. Changing Chart `groupField` back to `"configDocId|paramDefDocId"`

However, the current approach is superior and recommended.
