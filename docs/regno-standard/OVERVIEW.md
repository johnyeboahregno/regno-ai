# Regno Standard Overview

> **Universal Telemetry Data Standard**
>
> A single data format that can be written and read by all systems.

## What is Regno Standard?

The Regno Standard defines the format of a fixed collection of performant JSON documents used for storing data, configuration, and metadata across various industries. It makes all your data speak the same language.

**Source**: [regnostandard.com](https://www.regnostandard.com)

---

## Core Mission

The standard addresses fragmentation caused by proprietary data formats across:

| Industry | Use Cases |
|----------|-----------|
| **Aerospace** | Telemetry, flight data, sensor readings |
| **Formula 1 / Motorsport** | Race telemetry, ECU data, lap times |
| **Automotive** | CAN bus data, vehicle diagnostics |
| **Energy** | Grid monitoring, power telemetry |
| **Pharmaceutical** | Environmental monitoring, process data |
| **Industrial IoT** | Sensor networks, machine telemetry |

---

## Key Benefits

### Unified Data Access
All data in a single pool regardless of source, type, or format. Enables:
- Cross-query and data aggregation across sources
- Data augmentation and mining within unified pools
- Unrestricted access to user-generated data

### Performance
Documents are designed to be as lightweight as possible, containing only a small subset of the complete dataset. They're optimized for fast and simple indexing within document databases.

### Big Data Ready
Built for cloud and on-premises deployment with support for:
- Massive time-series data
- High-frequency telemetry
- Distributed storage systems

---

## Technical Foundation

| Aspect | Implementation |
|--------|----------------|
| **Format** | JSON-based documents |
| **API** | REST API compatible |
| **Timestamps** | Nanoseconds since Unix epoch |
| **Compression** | GZip for sample arrays |
| **IDs** | Hash-based unique identifiers |
| **Database** | Document database optimized (MongoDB, etc.) |

---

## Document Categories

The standard comprises documents organized into four categories:

### 1. Configuration Documents
Root-level metadata containers:
- `ConfigDoc` - Top-level configuration
- `SubConfigDoc` - Sub-configuration metadata

### 2. Identity Documents
Ownership and identification:
- `IdentityDoc` - Document ownership markers

### 3. Definition Documents
Reusable templates for data structure:
- `ParamDefinitionDoc` - Parameter definitions
- `EventDefinitionDoc` - Event type definitions
- `ConvDefinitionDoc` - Conversion formulas
- `CANMessageDefinitionDoc` - CAN bus message definitions
- `CANSignalDefinitionDoc` - CAN signal definitions
- `AliasDefinitionDoc` - Parameter aliases

### 4. Data Documents
Actual telemetry and measurement data:
- `ParamSamplesDoc` - Time-series parameter samples
- `ChannelSamplesDoc` - Channel-based samples
- `ParamScalarValueDoc` - Single scalar values
- `ParamArrayValueDoc` - Array values
- `EventDataDoc` - Event instances
- `StatDoc` - Statistical summaries
- `TagDoc` - Key-value metadata
- `TimeSpanDoc` - Time segment markers
- `MediaDataDoc` - Media file metadata

---

## Document Relationships

```
ConfigDoc (Root)
    |
    +-- SubConfigDoc[] (Metadata)
    |       |
    |       +-- TimeSpanDoc[]
    |       +-- TagDoc[]
    |
    +-- IdentityDoc[] (Ownership)
    |
    +-- Definition Documents (Templates)
    |       |
    |       +-- ParamDefinitionDoc
    |       +-- EventDefinitionDoc
    |       +-- ConvDefinitionDoc
    |       +-- CANMessageDefinitionDoc
    |       +-- CANSignalDefinitionDoc
    |
    +-- Data Documents (Values)
            |
            +-- ParamSamplesDoc -> ParamDefinitionDoc
            +-- ChannelSamplesDoc -> ParamDefinitionDoc
            +-- EventDataDoc -> EventDefinitionDoc
            +-- ParamScalarValueDoc -> ParamDefinitionDoc
            +-- StatDoc
            +-- MediaDataDoc
```

---

## Governance

The Regno Standard is:
- Governed by a Technical Working Group
- Open to feedback and contributions from users
- Licensed under Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License

---

## Quick Links

- [Document Hierarchy](./DOCUMENT_HIERARCHY.md)
- [Configuration Documents](./CONFIGURATION_DOCUMENTS.md)
- [Definition Documents](./DEFINITION_DOCUMENTS.md)
- [Data Documents](./DATA_DOCUMENTS.md)
- [Naming Conventions](./NAMING_CONVENTIONS.md)
- [Timestamps and IDs](./TIMESTAMP_AND_ID.md)
- [JSON Examples](./EXAMPLES.md)
