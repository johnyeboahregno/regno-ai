# Min/Max Visualization Configuration Guide

## Overview
The D3 chart now supports visualizing min/max value ranges for time-series data using either **Range Areas** or **Error Bars** (or both simultaneously).

## Configuration Options

Add these settings to your chart node's `lineChart` configuration:

```javascript
{
  chartType: 'line',
  fields: {
    xField: 'startTime',    // Your time field
    yField: 'avg',          // Your main value field
    groupField: 'category'  // Optional: for grouped charts
  },
  lineChart: {
    // ... existing line chart settings ...

    // Min/Max Visualization Settings
    showMinMax: true,           // Enable/disable min/max visualization
    minMaxStyle: 'area',        // Options: 'area' | 'errorBars' | 'both'
    minField: 'min',            // Field name containing minimum values
    maxField: 'max',            // Field name containing maximum values
    rangeOpacity: 0.2,          // Opacity for area fill (0-1)
    errorBarWidth: 8            // Width of error bar caps in pixels
  }
}
```

## Visualization Styles

### 1. Range Area (`minMaxStyle: 'area'`)
- Creates a **filled area** between min and max values
- Best for: Continuous ranges, confidence intervals, forecasting bounds
- Visual impact: Shows the "envelope" of possible values
- Works great with multiple categories (each gets its own colored band)

```javascript
lineChart: {
  showMinMax: true,
  minMaxStyle: 'area',
  rangeOpacity: 0.15    // Lower opacity for less visual clutter
}
```

### 2. Error Bars (`minMaxStyle: 'errorBars'`)
- Creates **vertical lines with caps** from min to max at each data point
- Best for: Discrete measurements, statistical uncertainty, sparse data
- Visual impact: Clean, doesn't obscure other data
- Perfect for showing measurement precision

```javascript
lineChart: {
  showMinMax: true,
  minMaxStyle: 'errorBars',
  errorBarWidth: 10     // Wider caps for better visibility
}
```

### 3. Both (`minMaxStyle: 'both'`)
- Combines range area **and** error bars
- Best for: Presentations, when you need maximum clarity
- Visual impact: Most comprehensive but potentially busy

```javascript
lineChart: {
  showMinMax: true,
  minMaxStyle: 'both',
  rangeOpacity: 0.1,    // Lower opacity to not overwhelm error bars
  errorBarWidth: 6
}
```

## Data Structure Requirements

### Option 1: With Center Value (avg, mean, value, etc.)
Your data records must include the min/max fields:

```javascript
{
  startTime: 1760371839914,
  avg: 50,      // Main value (yField)
  min: 45,      // Minimum value
  max: 55,      // Maximum value
  category: 'A' // Optional: for grouped charts
}
```

### Option 2: Min/Max Only (Auto-Midpoint)
If you **only have min/max values** without a center value:

```javascript
{
  startTime: 1760371839914,
  min: 45,      // Minimum value
  max: 55,      // Maximum value
  category: 'A' // Optional: for grouped charts
}
```

**Configuration for Auto-Midpoint:**
- Leave **YField** empty or set to "none"
- Enable **Show Min/Max Range**
- The chart will **automatically calculate** the midpoint: `(min + max) / 2`
- This synthetic midpoint becomes the primary line
- The min/max range is shown around it

This is perfect when you have measurement ranges but no explicit center value!

## Grouped Charts

For charts with multiple categories (grouped by `groupField`):
- Each category gets its **own colored range area**
- Error bars match their category's line color
- Categories can be toggled on/off (ranges hide with their lines)

## Streaming Charts

Min/max visualization works seamlessly with streaming data:
- Range areas update smoothly as new data arrives
- Error bars are added/removed using D3 data joins
- No performance impact on streaming performance

## Examples

### Example 1: Forecasting with Confidence Intervals
```javascript
lineChart: {
  showMinMax: true,
  minMaxStyle: 'area',
  minField: 'confidenceLow',
  maxField: 'confidenceHigh',
  rangeOpacity: 0.2
}
```

### Example 2: Sensor Data with Measurement Error
```javascript
lineChart: {
  showMinMax: true,
  minMaxStyle: 'errorBars',
  minField: 'minMeasurement',
  maxField: 'maxMeasurement',
  errorBarWidth: 8
}
```

### Example 3: Performance Monitoring (Multiple Metrics)
```javascript
lineChart: {
  showMinMax: true,
  minMaxStyle: 'area',
  minField: 'p10',    // 10th percentile
  maxField: 'p90',    // 90th percentile
  rangeOpacity: 0.15
}
```

### Example 4: Min/Max Only with Auto-Midpoint
```javascript
// Data Mapping
fields: {
  xField: 'timestamp',
  yField: '',  // ← Leave empty!
  groupField: 'sensor'
}

// Line Chart
lineChart: {
  showMinMax: true,
  minMaxStyle: 'both',
  minField: 'min',
  maxField: 'max',
  rangeOpacity: 0.2,
  errorBarWidth: 8
}

// Chart will automatically:
// 1. Calculate midpoint: (min + max) / 2
// 2. Draw primary line at midpoint
// 3. Show range from min to max around it
```

## Visual Tips

1. **Opacity**: Lower values (0.1-0.2) work best for range areas with multiple categories
2. **Error Bar Width**: 6-10 pixels provides good visibility without cluttering
3. **Style Choice**:
   - Use `'area'` for continuous trends
   - Use `'errorBars'` for discrete measurements
   - Use `'both'` sparingly (presentations only)

## Disabling Min/Max

To disable min/max visualization:

```javascript
lineChart: {
  showMinMax: false  // or just omit the setting entirely
}
```

## Notes

- Min/max visualization is **automatically disabled** if `minField` or `maxField` is missing from data
- Records without valid min/max values are **silently skipped** (no errors)
- Works with all chart features: zoom, pan, category filtering, streaming, etc.
- Compatible with all curve types (`curveMonotoneX`, `curveLinear`, etc.)
