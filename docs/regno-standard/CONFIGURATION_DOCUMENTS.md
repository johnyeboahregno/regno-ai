# Regno Standard: Configuration Documents

Configuration documents are the root-level containers that organize and describe telemetry datasets.

---

## ConfigDoc

The highest-level document in a Configuration Document Collection. Functions as a metadata container and structural overview for all child documents.

### Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | String | Yes | - | Regno unique document identifier |
| `type` | Fixed String | No | `ConfigDoc` | Document type classification |
| `name` | String | Yes | - | Configuration identifier/name |
| `description` | String | No | - | Free-form data summary |
| `source` | String | No | - | Source filename with extension |
| `startTime` | Int64 | Yes | - | Start timestamp (nanoseconds since epoch) |
| `endTime` | Int64 | No | - | End timestamp (nanoseconds since epoch) |
| `timeOffset` | Int64 | No | - | Time offset in nanoseconds (positive or negative) |
| `state` | Fixed String | Yes | `Unknown` | Lifecycle status |
| `sourceType` | Fixed String | Yes | `Data` | Data classification type |
| `subConfigDocs` | SubConfigDoc[] | Yes | - | Array of sub-configuration metadata |
| `identityDocIds` | String[] | No | - | References to IdentityDoc identifiers |
| `timeSpanDocs` | TimeSpanDoc[] | No | - | Segmented time span instances |
| `configDefsDocIds` | String[] | No | - | Definition document references for fast retrieval |
| `tags` | TagDoc[] | No | - | Key/value metadata pairs |

### State Values

| State | Description |
|-------|-------------|
| `Unknown` | Initial/default state |
| `Importing` | Data import in progress |
| `Live` | Active, receiving real-time data |
| `Historic` | Completed, read-only |
| `Invalid` | Failed validation |
| `Merging` | Being merged with other data |
| `Deleted` | Marked for deletion |
| `Archive` | Archived for long-term storage |
| `Draft` | Work in progress |

### JSON Example

```json
{
  "id": "cfg-2024011500001",
  "type": "ConfigDoc",
  "name": "Monaco GP Practice 1",
  "description": "Free Practice 1 session telemetry",
  "source": "telemetry_2024_01_15.bin",
  "startTime": 1705312800000000000,
  "endTime": 1705316400000000000,
  "timeOffset": 0,
  "state": "Live",
  "sourceType": "Data",
  "subConfigDocs": [
    {
      "id": "sub-001",
      "name": "ECU Data",
      "group": "telemetry",
      "version": 1,
      "state": "Live",
      "sourceType": "Data"
    }
  ],
  "identityDocIds": ["id-team-ferrari"],
  "tags": [
    { "key": "circuit", "value": "Monaco" },
    { "key": "driver", "value": "16" }
  ]
}
```

---

## SubConfigDoc

Child configuration document that organizes data within a ConfigDoc. Enables multiple data versions under unified metadata.

### Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | String | Yes | - | Regno unique document identifier |
| `type` | Fixed String | No | `SubConfigDoc` | Document type classification |
| `name` | String | Yes | - | Free-form name for the data |
| `description` | String | No | - | Free-form description |
| `group` | String | Yes | - | Group this configuration belongs to |
| `version` | Int32 | Yes | - | Sequence/version number |
| `state` | Fixed String | No | `Unknown` | Document lifecycle state |
| `sourceType` | Fixed String | No | `Data` | Data category classification |
| `startTime` | Int64 | No | - | Start timestamp (nanoseconds) |
| `endTime` | Int64 | No | - | End timestamp (nanoseconds) |
| `tags` | TagDoc[] | No | - | Key/value metadata pairs |

### Source Types

| Type | Description |
|------|-------------|
| `Configuration` | Configuration metadata |
| `Data` | Raw telemetry data |
| `Experiment` | Experimental data |
| `Simulation` | Simulated data |
| `Run` | Single test run |
| `Period` | Time period |
| `Session` | Complete session |
| `Event` | Specific event |
| `Day` / `Month` / `Year` | Calendar-based |
| `Lap` | Single lap (motorsport) |
| `Audio` | Audio recording |
| `Video` | Video recording |
| `Metrics` | Derived metrics |

### JSON Example

```json
{
  "id": "sub-ecu-001",
  "type": "SubConfigDoc",
  "name": "ECU Primary Stream",
  "description": "Engine Control Unit primary telemetry",
  "group": "powertrain",
  "version": 1,
  "state": "Live",
  "sourceType": "Data",
  "startTime": 1705312800000000000,
  "endTime": 1705316400000000000,
  "tags": [
    { "key": "sensor_count", "value": "128" },
    { "key": "sample_rate", "value": "1000" }
  ]
}
```

---

## IdentityDoc

Optional document for establishing ownership and including identifying markers for document collections.

### Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | String | Yes | - | Regno unique document identifier |
| `type` | Fixed String | No | `IdentityDoc` | Document type classification |
| `tags` | Dictionary | No | - | Key/value pairs for ownership metadata |

### JSON Example

```json
{
  "id": "id-team-ferrari",
  "type": "IdentityDoc",
  "tags": {
    "organization": "Scuderia Ferrari",
    "department": "Telemetry",
    "contact": "telemetry@ferrari.com",
    "access_level": "confidential"
  }
}
```

---

## Use Cases

### Single Source Configuration

```
ConfigDoc
    |
    +-- SubConfigDoc: "Primary Data"
            +-- All telemetry data
```

### Multi-Source Configuration

```
ConfigDoc
    |
    +-- SubConfigDoc: "Real Data" (sourceType: Data)
    +-- SubConfigDoc: "Simulation" (sourceType: Simulation)
    +-- SubConfigDoc: "Video" (sourceType: Video)
```

### Version-Controlled Configuration

```
ConfigDoc
    |
    +-- SubConfigDoc: "v1.0" (version: 1)
    +-- SubConfigDoc: "v1.1" (version: 2)
    +-- SubConfigDoc: "v2.0" (version: 3)
```
