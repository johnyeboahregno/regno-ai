# Auto-Field Generation Guide

The D3 Chart now supports **automatic field generation** when X or Y fields are not specified in the configuration. This allows for flexible chart creation without requiring explicit field mapping.

## Auto-Generated Fields

### 1. **X-Axis: Auto-Index**
When `xField` is empty or not specified:
- Automatically generates a sequential index field: `__index`
- Values: `1, 2, 3, 4, ...` (1-based indexing)
- Perfect for: Sequential data, ordered lists, or when you don't have a time/category field

**Configuration:**
```javascript
fields: {
  xField: '',  // ← Leave empty
  yField: 'value'
}
```

**Result:**
- X-axis shows: 1, 2, 3, 4, 5...
- Each data point is plotted at its sequence position

---

### 2. **Y-Axis: Auto-Midpoint (from Min/Max)**
When `yField` is empty AND `showMinMax` is enabled:
- Automatically calculates midpoint: `(min + max) / 2`
- Creates synthetic field: `__midpoint`
- Perfect for: Range data without explicit center values

**Configuration:**
```javascript
fields: {
  xField: 'timestamp',
  yField: ''  // ← Leave empty
},
lineChart: {
  showMinMax: true,
  minField: 'min',
  maxField: 'max',
  minMaxStyle: 'area'
}
```

**Data Example:**
```javascript
{
  timestamp: 1760371839914,
  min: 45,
  max: 55
  // No 'value' or 'avg' field needed!
}
```

**Result:**
- Primary line drawn at midpoint: `(45 + 55) / 2 = 50`
- Range area/error bars show min-to-max spread

---

### 3. **Y-Axis: Auto-Index (Fallback)**
When `yField` is empty AND `showMinMax` is disabled:
- Automatically generates sequential index: `__yIndex`
- Values: `1, 2, 3, 4, ...`
- Perfect for: Counting records, row numbers

**Configuration:**
```javascript
fields: {
  xField: 'category',
  yField: ''  // ← Leave empty
},
lineChart: {
  showMinMax: false
}
```

**Result:**
- Y-axis shows: 1, 2, 3, 4, 5...
- Each data point gets sequential Y value

---

## Use Cases

### Use Case 1: Min/Max Range Data Only
**Scenario:** You have measurement ranges but no explicit average/center value.

```javascript
// Data
[
  { time: '2025-01-01', min: 20, max: 30 },
  { time: '2025-01-02', min: 25, max: 35 },
  { time: '2025-01-03', min: 22, max: 32 }
]

// Config
{
  fields: {
    xField: 'time',
    yField: ''  // Auto-midpoint
  },
  lineChart: {
    showMinMax: true,
    minMaxStyle: 'area',
    minField: 'min',
    maxField: 'max'
  }
}

// Chart shows:
// - Line at midpoints: 25, 30, 27
// - Shaded area from min to max
```

---

### Use Case 2: Sequential Data Without Explicit X-Axis
**Scenario:** You have ordered measurements but no timestamp or category field.

```javascript
// Data
[
  { value: 10 },
  { value: 15 },
  { value: 12 },
  { value: 18 }
]

// Config
{
  fields: {
    xField: '',  // Auto-index
    yField: 'value'
  }
}

// Chart shows:
// X-axis: 1, 2, 3, 4
// Y-axis: 10, 15, 12, 18
```

---

### Use Case 3: Both X and Y Auto-Generated
**Scenario:** You only have min/max ranges with no other fields.

```javascript
// Data
[
  { min: 10, max: 20 },
  { min: 15, max: 25 },
  { min: 12, max: 22 }
]

// Config
{
  fields: {
    xField: '',  // Auto-index
    yField: ''   // Auto-midpoint
  },
  lineChart: {
    showMinMax: true,
    minField: 'min',
    maxField: 'max'
  }
}

// Chart shows:
// X-axis: 1, 2, 3 (sequential)
// Y-axis: 15, 20, 17 (midpoints)
// Range areas from min to max
```

---

## UI Guidance

The chart configuration UI now shows helpful hints:

### X Field Input:
> 💡 Leave empty to auto-generate sequential index (1, 2, 3...)

### Y Field Input:
> 💡 Leave empty to:
> - Auto-generate midpoint from min/max (if Min/Max visualization enabled)
> - Or use sequential index (1, 2, 3...)

---

## Technical Details

### Auto-Field Generation Order
1. **X-Field**: Checked first, generates `__index` if empty
2. **Y-Field**: Checked second, generates:
   - `__midpoint` if `showMinMax` is enabled
   - `__yIndex` otherwise

### Field Naming
- Auto-generated fields use double underscore prefix: `__index`, `__midpoint`, `__yIndex`
- These are synthetic fields added to data records during rendering
- Original data is not modified

### Streaming Support
- ✅ Auto-generation works with streaming charts
- Fields are regenerated for each batch of incoming data
- No performance impact

### Compatibility
- Works with all chart types (line, bar, scatter, etc.)
- Compatible with grouping, multiple series, and all other features
- Min/max visualization requires line charts

---

## Examples in Practice

### Example 1: Temperature Ranges
```javascript
// You receive data: { time, minTemp, maxTemp }
// No avgTemp field!

fields: { xField: 'time', yField: '' }
lineChart: {
  showMinMax: true,
  minField: 'minTemp',
  maxField: 'maxTemp'
}

→ Chart shows temperature midpoints with range bands
```

### Example 2: Count Records
```javascript
// Data has no numeric fields, just categories
[{ category: 'A' }, { category: 'B' }, { category: 'A' }]

fields: { xField: 'category', yField: '' }
lineChart: { showMinMax: false }

→ Chart counts: A=2, B=1 (using auto Y-index)
```

### Example 3: Pure Sequential Plot
```javascript
// Minimal data: just values
[{ val: 5 }, { val: 8 }, { val: 3 }]

fields: { xField: '', yField: 'val' }

→ Chart plots values at positions 1, 2, 3
```

---

## Summary

**Auto-field generation eliminates the need for explicit field mapping when:**
- You don't have a natural X-axis field (timestamps, categories)
- You have min/max ranges without center values
- You want simple sequential plotting

**Just leave the fields empty and the chart handles the rest!** 🎨
