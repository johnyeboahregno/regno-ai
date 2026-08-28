# Regno Standard: Timestamps and IDs

This document covers the timestamp format and unique ID generation specifications for Regno Standard documents.

---

## Timestamp Specification

### Format: Nanoseconds Since Unix Epoch

All timestamps in the Regno Standard are represented as **64-bit Long (Int64)** values containing the number of nanoseconds since the reference time of:

**Midnight, 1st January 1970 UTC (Unix Epoch)**

### Why Nanoseconds?

| Precision | Use Case |
|-----------|----------|
| Seconds | Insufficient for high-frequency telemetry |
| Milliseconds | Common but limited for motorsport/aerospace |
| Microseconds | Good but still limiting for ECU data |
| **Nanoseconds** | Supports all use cases up to GHz sampling |

### Range

```
Minimum: 0 (Jan 1, 1970 00:00:00.000000000 UTC)
Maximum: 9,223,372,036,854,775,807 (approx. year 2262)
```

### Conversion Examples

| Human Readable | Nanoseconds |
|----------------|-------------|
| Jan 1, 2024 00:00:00 UTC | 1704067200000000000 |
| Jan 15, 2024 10:00:00 UTC | 1705312800000000000 |
| 1 second | 1000000000 |
| 1 millisecond | 1000000 |
| 1 microsecond | 1000 |

### Code Examples

**JavaScript:**
```javascript
// Current time in nanoseconds
const nowNanos = BigInt(Date.now()) * 1000000n;

// Convert nanoseconds to Date
function nanosToDate(nanos) {
  return new Date(Number(nanos / 1000000n));
}

// Convert Date to nanoseconds
function dateToNanos(date) {
  return BigInt(date.getTime()) * 1000000n;
}
```

**Python:**
```python
import time

# Current time in nanoseconds
now_nanos = int(time.time() * 1e9)

# Convert nanoseconds to datetime
from datetime import datetime
def nanos_to_datetime(nanos):
    return datetime.fromtimestamp(nanos / 1e9)

# Convert datetime to nanoseconds
def datetime_to_nanos(dt):
    return int(dt.timestamp() * 1e9)
```

**TypeScript:**
```typescript
// Current time in nanoseconds
const nowNanos: bigint = BigInt(Date.now()) * 1000000n;

// Parse Regno timestamp
function parseRegnoTimestamp(nanos: bigint): Date {
  return new Date(Number(nanos / 1000000n));
}
```

---

## Timestamp Fields

| Field | Description |
|-------|-------------|
| `startTime` | Beginning of time range |
| `endTime` | End of time range |
| `time` | Specific event/sample time |
| `timeOffset` | Adjustment value (can be negative) |
| `duration` | Length in nanoseconds |

### Time Offset Usage

The `timeOffset` field allows adjusting all timestamps in a dataset:

```json
{
  "startTime": 1705312800000000000,
  "timeOffset": -3600000000000
}
// Effective start: 1705309200000000000 (1 hour earlier)
```

---

## Unique ID Generation

### Principle: Content-Based Hashing

All documents conforming to the Regno Standard must be given a unique identifier at creation time. The recommended approach:

> Calculate a hash of all fields and values (excluding the `id` field) that are contained in the document.

### Benefits

| Benefit | Description |
|---------|-------------|
| **Deduplication** | New documents can be validated against existing stores |
| **Efficiency** | Reusable documents avoid redundant storage |
| **Data Integrity** | Enables merge/sync without corruption |
| **Idempotency** | Same content always produces same ID |

### Algorithm Recommendations

While the standard doesn't mandate a specific algorithm, common choices:

| Algorithm | Output Size | Use Case |
|-----------|-------------|----------|
| SHA-256 | 64 hex chars | Most secure, recommended |
| SHA-1 | 40 hex chars | Legacy systems |
| MD5 | 32 hex chars | Not recommended (collisions) |

### Implementation Steps

1. **Serialize** document to canonical JSON (sorted keys)
2. **Exclude** the `id` field from serialization
3. **Compute** hash of serialized string
4. **Format** as lowercase hexadecimal string

### Code Example (JavaScript)

```javascript
import crypto from 'crypto';

function generateRegnoId(document) {
  // Clone and remove id
  const { id, ...docWithoutId } = document;

  // Canonical JSON (sorted keys)
  const canonical = JSON.stringify(docWithoutId, Object.keys(docWithoutId).sort());

  // SHA-256 hash
  return crypto.createHash('sha256').update(canonical).digest('hex');
}
```

### Code Example (Python)

```python
import hashlib
import json

def generate_regno_id(document):
    # Remove id field
    doc_copy = {k: v for k, v in document.items() if k != 'id'}

    # Canonical JSON
    canonical = json.dumps(doc_copy, sort_keys=True, separators=(',', ':'))

    # SHA-256 hash
    return hashlib.sha256(canonical.encode()).hexdigest()
```

---

## ID Prefixes (Recommended)

While not required, using prefixes improves readability:

| Document Type | Prefix | Example |
|---------------|--------|---------|
| ConfigDoc | `cfg-` | `cfg-abc123def456` |
| SubConfigDoc | `sub-` | `sub-789xyz012` |
| ParamDefinitionDoc | `param-def-` | `param-def-engine-rpm` |
| EventDefinitionDoc | `event-def-` | `event-def-pit-entry` |
| ParamSamplesDoc | `samples-` | `samples-001` |
| EventDataDoc | `event-` | `event-pit-001` |
| StatDoc | `stat-` | `stat-lap-time` |
| TagDoc | `tag-` | `tag-driver` |
| MediaDataDoc | `media-` | `media-onboard-cam` |
| IdentityDoc | `id-` | `id-team-ferrari` |

---

## Fields Excluded from Hash

Certain fields are excluded from hash computation to allow updates without regenerating IDs:

| Field | Reason |
|-------|--------|
| `id` | Would create circular dependency |
| `state` | May change during lifecycle |
| `modified` | Timestamps change on update |
| `version` | Version tracking field |

---

## Handling Time Zones

### Storage: Always UTC

All timestamps are stored as nanoseconds since Unix epoch, which is inherently UTC.

### Display: Local Conversion

Convert to local time only for display:

```javascript
function formatLocalTime(nanos, timezone = 'America/New_York') {
  const date = new Date(Number(nanos / 1000000n));
  return date.toLocaleString('en-US', { timeZone: timezone });
}
```

### Source Timezone Tracking

Use tags to record original timezone:

```json
{
  "tags": [
    { "key": "source_timezone", "value": "Europe/Monaco" }
  ]
}
```

---

## Sample Rate Calculation

Given timestamps, calculate effective sample rate:

```javascript
function calculateSampleRate(startTime, endTime, sampleCount) {
  const durationNanos = endTime - startTime;
  const durationSeconds = Number(durationNanos) / 1e9;
  return sampleCount / durationSeconds; // Hz
}
```

---

## Time Range Queries

Efficient querying by time range:

```javascript
// MongoDB query for time range
const query = {
  startTime: { $gte: startNanos },
  endTime: { $lte: endNanos }
};

// Overlapping ranges
const overlapQuery = {
  startTime: { $lt: endNanos },
  endTime: { $gt: startNanos }
};
```

---

## Best Practices

### Timestamp Handling

1. **Always use BigInt** in JavaScript for nanosecond precision
2. **Store as Int64** in databases (MongoDB, PostgreSQL)
3. **Validate ranges** - reject timestamps before 1970 or after 2262
4. **Handle timezone** conversion only at display layer

### ID Generation

1. **Generate on creation** - never modify after
2. **Use consistent algorithm** across all systems
3. **Include prefix** for document type identification
4. **Validate uniqueness** before insert
