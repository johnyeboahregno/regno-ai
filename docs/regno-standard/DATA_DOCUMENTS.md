# Regno Standard: Data Documents

Data documents contain actual telemetry values, timestamps, and measurements. They reference Configuration and Definition documents for context and interpretation.

---

## ParamSamplesDoc

Time-series samples for a parameter. Contains compressed arrays of timestamps and values.

### Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | String | Yes | - | Regno unique document identifier |
| `type` | Fixed String | No | `ParamSamplesDoc` | Document type |
| `configDocId` | String | Yes | - | Associated ConfigDoc ID |
| `paramDefDocId` | String | Yes | - | Associated ParamDefinitionDoc ID |
| `dataType` | Fixed String | No | `Double` | Value data type |
| `startTime` | Int64 | Yes | - | Start timestamp (nanoseconds) |
| `endTime` | Int64 | Yes | - | End timestamp (nanoseconds) |
| `sampleCount` | Int64 | Yes | - | Number of samples |
| `min` | Double | Yes | - | Minimum value in document |
| `max` | Double | Yes | - | Maximum value in document |
| `sampleTimes` | Byte[] | No | - | GZip compressed timestamps |
| `times` | Int64[] | No | - | Uncompressed timestamps |
| `sampleValues` | Byte[] | No | - | GZip compressed values |

### Data Types

| Type | Size | Description |
|------|------|-------------|
| `Double` | 64-bit | Double-precision float |
| `Float` | 32-bit | Single-precision float |
| `Long` | 64-bit | Signed integer |
| `Integer` | 32-bit | Signed integer |
| `Short` | 16-bit | Signed integer |
| `Byte` | 8-bit | Unsigned byte |

### Compression

The `sampleTimes` and `sampleValues` arrays use **GZip compression**:

1. Values are serialized to binary based on `dataType`
2. Binary data is GZip compressed
3. Compressed data is Base64 encoded for JSON storage

**Decompression steps:**
1. Base64 decode to binary
2. GZip decompress
3. Deserialize based on `dataType`

### JSON Example

```json
{
  "id": "samples-rpm-001",
  "type": "ParamSamplesDoc",
  "configDocId": "cfg-2024011500001",
  "paramDefDocId": "param-def-engine-rpm",
  "dataType": "Double",
  "startTime": 1705312800000000000,
  "endTime": 1705312801000000000,
  "sampleCount": 1000,
  "min": 800.0,
  "max": 15000.0,
  "sampleTimes": "H4sIAAAAAAAA/+3dB3...",
  "sampleValues": "H4sIAAAAAAAA/+3dB3..."
}
```

---

## ChannelSamplesDoc

Sub-sampled or super-sampled channel data with min/max arrays.

### Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | String | Yes | - | Regno unique document identifier |
| `type` | Fixed String | No | `ChannelSamplesDoc` | Document type |
| `configDocId` | String | Yes | - | Associated ConfigDoc ID |
| `paramDefDocId` | String | Yes | - | Associated ParamDefinitionDoc ID |
| `startTime` | Int64 | Yes | - | Start timestamp (nanoseconds) |
| `endTime` | Int64 | Yes | - | End timestamp (nanoseconds) |
| `frequency` | Double | Yes | - | Sampling rate in Hz |
| `mins` | Double[] | Yes | - | Minimum values per interval |
| `maxs` | Double[] | Yes | - | Maximum values per interval |

### JSON Example

```json
{
  "id": "channel-rpm-overview",
  "type": "ChannelSamplesDoc",
  "configDocId": "cfg-2024011500001",
  "paramDefDocId": "param-def-engine-rpm",
  "startTime": 1705312800000000000,
  "endTime": 1705316400000000000,
  "frequency": 1.0,
  "mins": [800.0, 850.0, 900.0, ...],
  "maxs": [12000.0, 14000.0, 15000.0, ...]
}
```

---

## ParamScalarValueDoc

Single scalar value for a configuration parameter.

### Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | String | Yes | - | Regno unique document identifier |
| `type` | Fixed String | No | `ParamScalarValueDoc` | Document type |
| `configDocId` | String | Yes | - | Associated ConfigDoc ID |
| `paramDefDocId` | String | Yes | - | Associated ParamDefinitionDoc ID |
| `value` | Double | Yes | - | Scalar value |
| `time` | Int64 | No | - | Timestamp (nanoseconds) |
| `constant` | Boolean | No | - | True if value is constant |

### JSON Example

```json
{
  "id": "scalar-tire-pressure",
  "type": "ParamScalarValueDoc",
  "configDocId": "cfg-2024011500001",
  "paramDefDocId": "param-def-tire-pressure",
  "value": 26.5,
  "time": 1705312800000000000,
  "constant": false
}
```

---

## ParamArrayValueDoc

Array of values for a configuration parameter.

### Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | String | Yes | - | Regno unique document identifier |
| `type` | Fixed String | No | `ParamArrayValueDoc` | Document type |
| `configDocId` | String | Yes | - | Associated ConfigDoc ID |
| `paramDefDocId` | String | Yes | - | Associated ParamDefinitionDoc ID |
| `dataType` | Fixed String | No | `Double` | Value data type |
| `sampleCount` | Int64 | Yes | - | Number of samples |
| `time` | Int64 | No | - | Timestamp (nanoseconds) |
| `sampleTimes` | Byte[] | No | - | Compressed timestamps |
| `times` | Int64[] | No | - | Uncompressed timestamps |
| `sampleValues` | Byte[] | No | - | Compressed values |
| `doubleValues` | Double[] | No | - | Double array |
| `floatValues` | Single[] | No | - | Float array |
| `longValues` | Int64[] | No | - | Long array |
| `integerValues` | Int32[] | No | - | Integer array |
| `shortValues` | Int16[] | No | - | Short array |
| `byteValues` | Byte[] | No | - | Byte array |

### JSON Example

```json
{
  "id": "array-fuel-map",
  "type": "ParamArrayValueDoc",
  "configDocId": "cfg-2024011500001",
  "paramDefDocId": "param-def-fuel-map",
  "dataType": "Double",
  "sampleCount": 256,
  "doubleValues": [12.5, 13.2, 14.1, ...]
}
```

---

## EventDataDoc

Individual event instance with timestamp and status.

### Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | String | Yes | - | Regno unique document identifier |
| `type` | Fixed String | No | `EventDataDoc` | Document type |
| `configDocId` | String | Yes | - | Associated ConfigDoc ID |
| `eventDefDocId` | String | Yes | - | Associated EventDefinitionDoc ID |
| `time` | Int64 | Yes | - | Event timestamp (nanoseconds) |
| `status` | String | No | - | Free-form status value |

### JSON Example

```json
{
  "id": "event-pit-001",
  "type": "EventDataDoc",
  "configDocId": "cfg-2024011500001",
  "eventDefDocId": "event-def-pit-entry",
  "time": 1705314000000000000,
  "status": "PIT_IN"
}
```

---

## StatDoc

Statistical summary document.

### Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | String | Yes | - | Regno unique document identifier |
| `type` | Fixed String | No | `StatDoc` | Document type |
| `name` | String | Yes | - | Statistic name |
| `value` | Double | No | - | Numeric value |
| `textValue` | String | No | - | Text representation |

### JSON Example

```json
{
  "id": "stat-lap-time",
  "type": "StatDoc",
  "name": "Best Lap Time",
  "value": 78.234,
  "textValue": "1:18.234"
}
```

---

## TagDoc

Key-value metadata pair.

### Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | String | Yes | - | Regno unique document identifier |
| `type` | Fixed String | No | `TagDoc` | Document type |
| `key` | String | Yes | - | Tag key |
| `value` | String | No | - | Tag value |

### JSON Example

```json
{
  "id": "tag-driver",
  "type": "TagDoc",
  "key": "driver",
  "value": "Charles Leclerc"
}
```

---

## TimeSpanDoc

Time segment marker with classification.

### Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | String | Yes | - | Regno unique document identifier |
| `type` | Fixed String | No | `TimeSpanDoc` | Document type |
| `timeSpanType` | Fixed String | Yes | - | Temporal classification |
| `markerType` | String | Yes | - | Text description |
| `number` | Int32 | No | - | Numeric identifier |
| `startTime` | Int64 | Yes | - | Start timestamp (nanoseconds) |
| `endTime` | Int64 | No | - | End timestamp (nanoseconds) |
| `duration` | Int64 | No | - | Duration in nanoseconds |
| `source` | String | No | - | Data source identifier |

### TimeSpan Types

| Type | Description |
|------|-------------|
| `Interval` | Generic interval |
| `Lap` | Single lap |
| `Year` / `Month` / `Day` | Calendar-based |
| `Hour` / `Minute` / `Second` | Time-based |
| `Version` / `Revision` | Versioning |
| `Period` | Generic period |
| `Measurement` | Measurement window |
| `Test` / `Run` | Test segments |
| `Experiment` / `Result` | Experimental |

### JSON Example

```json
{
  "id": "timespan-lap-15",
  "type": "TimeSpanDoc",
  "timeSpanType": "Lap",
  "markerType": "Race Lap",
  "number": 15,
  "startTime": 1705314000000000000,
  "endTime": 1705314078234000000,
  "duration": 78234000000,
  "source": "timing-system"
}
```

---

## MediaDataDoc

Media file metadata with synchronization offsets.

### Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | String | Yes | - | Regno unique document identifier |
| `type` | Fixed String | No | `MediaDataDoc` | Document type |
| `configDocId` | String | Yes | - | Associated ConfigDoc ID |
| `name` | String | Yes | - | Media name/title |
| `description` | String | No | - | Media description |
| `source` | String | Yes | - | Media source/filename |
| `mediaType` | Fixed String | Yes | - | Media classification |
| `offset` | Int64 | No | - | Media file offset (nanoseconds) |
| `offsetConfig` | UInt64 | No | - | Config sync offset (nanoseconds) |
| `tags` | TagDoc[] | No | - | Metadata tags |

### Media Types

| Type | Description |
|------|-------------|
| `Video` | Video recording |
| `Audio` | Audio recording |
| `Image` | Static image |
| `VideoStream` | Live video stream |
| `AudioStream` | Live audio stream |

### JSON Example

```json
{
  "id": "media-onboard-cam",
  "type": "MediaDataDoc",
  "configDocId": "cfg-2024011500001",
  "name": "Onboard Camera",
  "description": "Front-facing driver camera",
  "source": "onboard_2024_01_15.mp4",
  "mediaType": "Video",
  "offset": 0,
  "offsetConfig": 1705312800000000000,
  "tags": [
    { "key": "camera", "value": "front" },
    { "key": "resolution", "value": "1920x1080" }
  ]
}
```
