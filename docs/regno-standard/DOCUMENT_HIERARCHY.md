# Regno Standard Document Hierarchy

This document explains how Regno Standard documents relate to each other and form a complete telemetry data structure.

---

## Hierarchical Structure

```
                         +------------------+
                         |    ConfigDoc     |  <- Root Configuration
                         |    (Required)    |
                         +--------+---------+
                                  |
          +-----------------------+-----------------------+
          |                       |                       |
          v                       v                       v
  +---------------+      +----------------+      +------------------+
  | SubConfigDoc  |      |  IdentityDoc   |      | Definition Docs  |
  |   (Required)  |      |   (Optional)   |      |   (Reusable)     |
  +-------+-------+      +----------------+      +--------+---------+
          |                                               |
          v                                               |
  +---------------+                                       |
  | TimeSpanDoc[] |                                       |
  |   TagDoc[]    |                                       |
  +---------------+                                       |
                                                          |
          +-----------------------------------------------+
          |
          v
  +----------------------------------------------------------+
  |                     Data Documents                        |
  |  (All reference configDocId + relevant definition doc)   |
  +----------------------------------------------------------+
  |                                                          |
  |  ParamSamplesDoc -----> ParamDefinitionDoc               |
  |  ChannelSamplesDoc ---> ParamDefinitionDoc               |
  |  ParamScalarValueDoc -> ParamDefinitionDoc               |
  |  ParamArrayValueDoc --> ParamDefinitionDoc               |
  |  EventDataDoc --------> EventDefinitionDoc               |
  |  StatDoc                                                 |
  |  MediaDataDoc                                            |
  +----------------------------------------------------------+
```

---

## Reference Fields

All documents use consistent field naming for references:

| Field | References | Description |
|-------|------------|-------------|
| `configDocId` | ConfigDoc.id | Links data to configuration |
| `paramDefDocId` | ParamDefinitionDoc.id | Links to parameter definition |
| `eventDefDocId` | EventDefinitionDoc.id | Links to event definition |
| `identityDocIds` | IdentityDoc.id[] | Links to ownership |

---

## ConfigDoc: The Root

Every Regno Standard dataset starts with a single `ConfigDoc`. This document:

- Contains overall metadata (name, description, time range)
- References child documents via arrays
- Defines the lifecycle state of the dataset
- Provides configuration-level tags

```json
{
  "id": "cfg-abc123",
  "type": "ConfigDoc",
  "name": "Race Session 2024-01-15",
  "description": "Monaco GP Practice 1",
  "startTime": 1705312800000000000,
  "endTime": 1705316400000000000,
  "state": "Live",
  "subConfigDocs": [...],
  "identityDocIds": ["id-team-001"],
  "tags": [...]
}
```

---

## SubConfigDoc: Metadata Grouping

`SubConfigDoc` documents group related data within a configuration:

- Multiple SubConfigDocs can exist per ConfigDoc
- Each represents a different data version or source
- Enables separating recorded data from simulation results

**Source Types:**
- `Configuration` - Config metadata
- `Data` - Raw telemetry data
- `Experiment` - Experimental data
- `Simulation` - Simulated data
- `Run` / `Session` / `Lap` - Time-segmented data
- `Audio` / `Video` - Media data
- `Metrics` - Derived metrics

---

## Definition Documents: Reusable Templates

Definition documents describe the structure of data without containing actual values. They can be:

- Shared across multiple ConfigDocs
- Version-controlled independently
- Referenced by multiple data documents

### Key Definition Types

| Document | Defines | Used By |
|----------|---------|---------|
| `ParamDefinitionDoc` | Parameter metadata, units, format | ParamSamplesDoc, ParamScalarValueDoc |
| `EventDefinitionDoc` | Event types, priorities | EventDataDoc |
| `ConvDefinitionDoc` | Conversion formulas | ParamDefinitionDoc |
| `CANMessageDefinitionDoc` | CAN bus messages | CANSignalDefinitionDoc |
| `CANSignalDefinitionDoc` | CAN signal structure | ParamDefinitionDoc |

---

## Data Documents: The Values

Data documents contain actual telemetry values. Each data document:

1. **References a ConfigDoc** via `configDocId`
2. **References a Definition Doc** for interpretation
3. **Contains time-stamped values**

### Time-Series Data Flow

```
ParamDefinitionDoc
        |
        | paramDefDocId
        v
+-----------------+     +-----------------+     +-----------------+
| ParamSamplesDoc | --> | sampleTimes[]   | --> | Nanoseconds     |
|                 |     | sampleValues[]  |     | since epoch     |
|                 |     | (GZip compressed)|    |                 |
+-----------------+     +-----------------+     +-----------------+
        |
        | configDocId
        v
    ConfigDoc
```

---

## Document Lifecycle States

Documents progress through lifecycle states:

| State | Description |
|-------|-------------|
| `Unknown` | Initial state, not yet processed |
| `Importing` | Data import in progress |
| `Live` | Active, receiving real-time data |
| `Historic` | Completed, read-only historical data |
| `Invalid` | Failed validation or corrupted |
| `Merging` | Being merged with other datasets |
| `Deleted` | Marked for deletion |
| `Archive` | Long-term storage, compressed |
| `Draft` | Work in progress, not finalized |

---

## Multiple Data Sources

A single ConfigDoc can contain data from multiple sources:

```
ConfigDoc: "Vehicle Test 2024"
    |
    +-- SubConfigDoc: "ECU Data" (sourceType: Data)
    |       +-- ParamSamplesDoc (RPM, Speed, Throttle)
    |
    +-- SubConfigDoc: "Simulation" (sourceType: Simulation)
    |       +-- ParamSamplesDoc (Simulated RPM, Speed)
    |
    +-- SubConfigDoc: "Video" (sourceType: Video)
            +-- MediaDataDoc (Onboard camera)
```

This enables:
- Comparison between real and simulated data
- Synchronized playback of telemetry with video
- Multi-source data fusion
