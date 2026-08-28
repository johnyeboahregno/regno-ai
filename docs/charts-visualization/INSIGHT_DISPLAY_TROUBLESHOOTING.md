# AI Insights Display - Troubleshooting Guide

## Issue: "I don't see anything on the display"

If the Insight node is showing an empty display or "No insights available" message, follow these steps:

---

## Step 1: Have You Executed the Pipeline?

The display only shows data **after** execution.

**Action:**
1. Open pipeline **P-D3**
2. Click the ▶️ button on **either**:
   - The Data Source node (bottom node connected to Insights)
   - OR the AI Insights node directly

**What you should see:**
- Nodes animate (spinning border)
- Progress logs in console
- After completion, the Insight node should show the display

---

## Step 2: Check Data Source Configuration

The Data Source needs the correct settings to output data in the format the Insight node expects.

**Action:**
1. Click on the **Data Source node** (node_1762245156401_zsz22ond6 - the one connected to Insights)
2. In the configuration modal, check:

### ⚠️ Critical Settings:

**Aggregation Operation:**
- Should be: **"none"** or **undefined**
- If it says **"pipeline"**, change it to **"none"**
- This allows the Aggregation Strategy to activate

**Aggregation Strategy:**
- Should be: **"auto detect"** or **"auto"**
- This tells it to use time-bucketed aggregation

**Max Records:**
- Should be: **1000** (or any reasonable number)

**MongoDB Credential:**
- Should be: **Set to a valid credential**
- Must have read access to ParamSamplesDoc collection

### 3. Click **Save** after making changes

---

## Step 3: Verify Connection Between Nodes

**Action:**
1. Look at your pipeline canvas
2. Verify there's a **line/edge** connecting:
   - From: Data Source node (bottom)
   - To: AI Insights node

**If no connection:**
1. Click the output port (right side) of Data Source node
2. Drag to the input port (left side) of AI Insights node
3. Save the pipeline (Ctrl+S or Save button)

---

## Step 4: Check for Execution Errors

**Action:**
1. Open the browser console (F12 > Console tab)
2. Execute the pipeline again
3. Look for error messages

**Common errors:**

### "LLM credential not configured"
- **Fix:** Open Insight node settings
- Set **LLM Credential** to a valid credential
- Make sure it has API quota remaining

### "Invalid $project :: caused by..."
- **Fix:** Data Source has a malformed custom pipeline
- Clear the **pipeline** field in Data Source config
- OR set **Aggregation Operation** to **"none"**

### "not authorized" or "authentication failed"
- **Fix:** MongoDB credential is invalid or expired
- Update the credential in Data Source settings
- Test the connection

### "No data available for analysis"
- **Fix:** The ParamSamplesDoc collection is empty
- OR the filter is too restrictive
- Check the filter conditions

---

## Step 5: Check Data Format

The Insight node expects data in this format:

```javascript
[
  {
    category: "some-category-id",
    value: 123.45,
    timestamp: "2025-11-05T10:30:00.000Z"
  },
  // ... more records
]
```

**What the Aggregation Strategy outputs:**
```javascript
[
  {
    category: "iXZugcRaXho8lCGIAJqbpFj55i0",  // from paramDefDocId
    value: 8.65,                              // mean of max values
    timestamp: "2025-01-15T10:30:00.000Z",   // from startTime
    metadata: {
      min: 8.45,
      max: 8.82,
      count: 12,
      bucketed: true,
      bucketSizeMs: 300000
    }
  }
]
```

**This matches perfectly!** ✅

---

## Step 6: Debug with Test Button

Instead of running the full pipeline, test just the Data Source node:

**Action:**
1. Click on the Data Source node
2. In the settings modal, click the **Test** button (🧪)
3. Watch the debug console open
4. Check the **Output** tab for data

**What you should see:**
- If Aggregation Strategy is working:
  - Console logs: `📊 Counting documents...`, `🎯 Auto-detected "bucket-5min"...`
  - Output: Array of ~1000 aggregated records
  - Each record has `category`, `value`, `timestamp`, `metadata`

- If it's NOT working:
  - You'll see all 63K raw records (slow!)
  - Records will have `paramDefDocId`, `max`, `startTime` instead

---

## Step 7: Verify Aggregation Strategy is Active

**In Server Console (Terminal):**

When you execute, you should see:
```
[Aggregation Strategy] Auto-detected "bucket-5min" for 63567 records
[Aggregation Strategy] Using "bucket-5min" strategy with 4 stages
[Aggregation Strategy] Bucket size: 300000ms
[Aggregation Strategy] Aggregation complete: 1000 records in 4.23s
```

**If you DON'T see these logs:**
- The aggregation strategy is NOT activating
- Check Step 2 above (Aggregation Operation should be "none")

**In Client Console (F12):**

You should see:
```
📊 Counting documents for auto-detection...
🎯 Auto-detected "bucket-5min" strategy for 63,567 records
⚙️  Using "bucket-5min" strategy with 4 stages
📥 Processed 100 records...
📥 Processed 200 records...
✅ Aggregation complete: 1000 records in 4.23s
```

---

## Step 8: Manual Fix for Aggregation Operation

If the UI won't let you change it, or you want to be sure:

**Using MongoDB Compass or Studio:**
1. Connect to database: `GhNF`
2. Open collection: `Pipelines`
3. Find document with: `id: "pipeline_1761251022723_hyanp2wgr"`
4. Find the node with: `id: "node_1762245156401_zsz22ond6"`
5. Edit the node's config:
   ```json
   {
     "aggregationOperation": "none",  // Change from "pipeline" to "none"
     "aggregationStrategy": "auto",
     "aggregationMaxRecords": 1000,
     "pipeline": ""  // Make sure this is empty or remove it
   }
   ```
6. Save the document
7. Refresh your browser

---

## Step 9: Check ParamSamplesDoc Has Data

**Action:**
1. Open MongoDB Compass/Studio
2. Navigate to: Database `GhNF` > Collection `ParamSamplesDoc`
3. Check document count

**If count = 0:**
- The collection is empty
- No insights can be generated
- You need to load data first

**If count > 0:**
- Check if documents match the filter:
  ```javascript
  {
    $and: [
      { min: { $ne: 0 } },
      { max: { $ne: 0 } },
      { "ai.processed": { $ne: true } }
    ]
  }
  ```
- Documents need `min`, `max`, `paramDefDocId`, `startTime` fields

---

## Quick Diagnostic Checklist

Run through this checklist:

- [ ] Pipeline has been executed (clicked ▶️)
- [ ] Data Source node: `aggregationOperation` = **"none"**
- [ ] Data Source node: `aggregationStrategy` = **"auto"**
- [ ] Data Source node: `aggregationMaxRecords` = **1000**
- [ ] Data Source node: MongoDB credential is set and valid
- [ ] Connection exists: Data Source → AI Insights
- [ ] Insight node: `llmCredentialId` is set and valid
- [ ] Insight node: `groupField` = **"category"**
- [ ] Insight node: `yField` = **"value"**
- [ ] Insight node: `timestampField` = **"timestamp"**
- [ ] ParamSamplesDoc collection has documents (count > 0)
- [ ] Server console shows aggregation strategy logs
- [ ] Client console (F12) shows progress messages
- [ ] No errors in console
- [ ] After execution, Insight node `outputs` array has data

---

## Expected Result After Fixing

When everything is working, you'll see:

### 1. Beautiful Header
```
╔════════════════════════════════════════════════════════╗
║ 🔍 AI Insights Report                                  ║
║ 15 categories · 63,567 records analyzed                ║
║                                          [Copy] [Download]║
╚════════════════════════════════════════════════════════╝
```

### 2. Structured AI Analysis
```
Executive Summary

The system shows healthy operation with 15 active parameters.
Critical finding: 3 categories exhibit anomalous behavior requiring
immediate attention...

Anomalies & Outliers (Ranked by Severity)

1. iXZugcRaXho... ⚠️ CRITICAL
   Z-Score: 3.45
   Mean: 125.4 (expected: 45.2)
   Recommended: Investigate immediately
...
```

### 3. Interactive Category Table
```
┌─────────────────────────────────────────────┐
│ 📊 Category Summary (15)      [Copy CSV] ▼  │
├─────────────────────────────────────────────┤
│ Category    │Records│ Mean │ P95  │ Trend │
│─────────────┼───────┼──────┼──────┼───────│
│ iXZugcRa... │ 4,234 │125.4 │180.2 │ ↗ ⚠️  │
│ jKLmnoPQ... │ 3,891 │ 45.2 │ 67.8 │ ━     │
└─────────────────────────────────────────────┘
```

---

## Still Not Working?

### Share These Details:

1. **Screenshot** of the Insight node (showing the empty display)
2. **Screenshot** of Data Source node configuration
3. **Console errors** (F12 > Console, copy any red error messages)
4. **Server console output** (from terminal)
5. **ParamSamplesDoc document count** (from MongoDB)

### Common "It's Working But..." Issues:

**"I see the display but it says 'No data available for analysis'"**
- The Data Source executed but returned 0 records
- Check filter conditions are not too restrictive
- Verify ParamSamplesDoc has matching documents

**"Execution takes forever (> 30 seconds)"**
- Missing MongoDB indexes
- Create indexes:
  ```javascript
  db.ParamSamplesDoc.createIndex({ startTime: 1 })
  db.ParamSamplesDoc.createIndex({ paramDefDocId: 1, startTime: 1 })
  ```

**"I see raw data instead of aggregated"**
- Aggregation Strategy is not activating
- Set `aggregationOperation` to **"none"** (not "pipeline")

**"LLM call failed"**
- LLM credential quota exhausted
- Model name incorrect
- Network connectivity issues

---

## Success Indicators

You'll know it's working when you see ALL of these:

✅ Server console: `[Aggregation Strategy] Auto-detected...`
✅ Client console: `📊 Counting documents...` → `✅ Aggregation complete...`
✅ Execution time: 3-7 seconds (with indexes)
✅ Insight node displays beautiful formatted report
✅ Category table shows 10-20 categories
✅ Copy/Download buttons are clickable
✅ No errors in any console

---

**Your insights are just one execution away!** 🚀
