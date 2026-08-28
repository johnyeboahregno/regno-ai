# Regno Standard: Naming Conventions

Consistent naming conventions ensure interoperability and readability across all Regno Standard implementations.

---

## Document Naming

Documents use **PascalCase** with no spacing, starting with an uppercase letter.

| Convention | Example |
|------------|---------|
| Standard format | `ConfigDoc`, `ParamSamplesDoc` |
| Definition suffix | `ParamDefinitionDoc`, `EventDefinitionDoc` |
| Data suffix | `EventDataDoc`, `MediaDataDoc` |

---

## Field Naming

Fields use **camelCase** with no spacing, starting with a lowercase letter.

| Convention | Example |
|------------|---------|
| Standard format | `configDocId`, `startTime`, `sampleCount` |
| Nested paths | `axisValuesX`, `linearRegressionSlope` |
| Reference fields | `paramDefDocId`, `eventDefDocId` |

---

## Standard Abbreviations

The Regno Standard uses consistent abbreviations for common terms:

| Full Term | Abbreviation |
|-----------|--------------|
| Configuration | `Config` |
| Parameter | `Param` |
| Conversion | `Conv` |
| Statistic | `Stat` |
| Definition | `Def` |
| Document | `Doc` |

### Examples

| Full Name | Abbreviated |
|-----------|-------------|
| Configuration Document | `ConfigDoc` |
| Parameter Definition Document | `ParamDefDoc` |
| Conversion Definition Document | `ConvDefDoc` |
| Event Definition Document | `EventDefDoc` |

---

## Reference Field Patterns

Reference fields point to other documents and follow specific patterns:

### Pattern: `[DocumentName]DocId`

Reference fields include the target document name plus the `Id` suffix.

| Field | References | Target Field |
|-------|------------|--------------|
| `configDocId` | ConfigDoc | `id` |
| `paramDefDocId` | ParamDefinitionDoc | `id` |
| `eventDefDocId` | EventDefinitionDoc | `id` |
| `identityDocIds` | IdentityDoc | `id` (array) |

### Example Usage

```json
{
  "id": "samples-001",
  "type": "ParamSamplesDoc",
  "configDocId": "cfg-abc123",      // References ConfigDoc.id = "cfg-abc123"
  "paramDefDocId": "param-def-rpm"  // References ParamDefinitionDoc.id = "param-def-rpm"
}
```

---

## Non-Reference Field Naming

Fields that are **not** references to other documents:

- Avoid abbreviations
- Use full descriptive names
- Be explicit about the data

| Good Examples | Avoid |
|---------------|-------|
| `documentInterval` | `docInt` |
| `linearRegressionSlope` | `linRegSlope` |
| `sampleCount` | `smpCnt` |
| `startTime` | `stTime` |

---

## Type Field Conventions

### Document Type Field

All document type fields are postfixed with `Doc`:

| Document | `type` Value |
|----------|--------------|
| ConfigDoc | `ConfigDoc` |
| ParamSamplesDoc | `ParamSamplesDoc` |
| EventDefDoc | `EventDefDoc` |

### Fixed String Types

Fields with enumerated values use **Fixed String** type:

```json
{
  "type": "ConfigDoc",           // Fixed document type
  "state": "Live",              // Fixed state enum
  "sourceType": "Data",         // Fixed source type enum
  "priority": "High"            // Fixed priority enum
}
```

---

## Source ID Conventions

The `sourceId` field uses a hierarchical dot-notation:

### Pattern: `[System].[Component].[Parameter]`

| Example | Interpretation |
|---------|----------------|
| `ECU.Engine.RPM` | ECU system, Engine component, RPM parameter |
| `GPS.Position.Latitude` | GPS system, Position component, Latitude |
| `TPMS.FrontLeft.Pressure` | TPMS system, FrontLeft wheel, Pressure |
| `CAN.0x100.EngineRPM` | CAN bus, Message 0x100, Engine RPM signal |

---

## Group Field Conventions

The `groups` field creates hierarchical structures using arrays:

```json
{
  "groups": ["Powertrain", "Engine", "Performance"]
}
```

This creates a tree structure:
```
Powertrain
    └── Engine
            └── Performance
```

### Best Practices

- Use consistent category names
- Limit depth to 3-4 levels
- Use descriptive but concise names

---

## Tag Key Conventions

Tags use lowercase with underscores for multi-word keys:

| Good Examples | Avoid |
|---------------|-------|
| `sample_rate` | `sampleRate` |
| `sensor_type` | `SensorType` |
| `data_source` | `dataSource` |

### Common Tag Keys

| Key | Purpose |
|-----|---------|
| `driver` | Driver name/number |
| `circuit` | Track/circuit name |
| `session` | Session type |
| `sensor` | Sensor identifier |
| `sample_rate` | Sample frequency |
| `unit` | Measurement unit |
| `calibration` | Calibration reference |

---

## CAN-Specific Naming

### Message IDs

CAN message IDs use hexadecimal notation:

| Format | Example |
|--------|---------|
| Standard | `0x100` |
| Extended | `0x18FEF100` |

### Signal Names

CAN signals use descriptive PascalCase:

| Example | Description |
|---------|-------------|
| `EngineRPM` | Engine speed signal |
| `ThrottlePosition` | Throttle percentage |
| `VehicleSpeed` | Speed in km/h or mph |

---

## File Naming

Source files referenced in `source` field:

### Pattern: `[description]_[date].[extension]`

| Example | Description |
|---------|-------------|
| `telemetry_2024_01_15.bin` | Binary telemetry file |
| `onboard_cam_fp1.mp4` | Video file |
| `ecu_log_20240115.csv` | CSV log file |

---

## Summary Table

| Element | Convention | Example |
|---------|------------|---------|
| Document names | PascalCase + Doc | `ConfigDoc` |
| Field names | camelCase | `startTime` |
| Reference fields | [Target]DocId | `configDocId` |
| Type values | PascalCase | `ParamSamplesDoc` |
| Source IDs | Dot notation | `ECU.Engine.RPM` |
| Tag keys | snake_case | `sample_rate` |
| CAN message IDs | Hex | `0x100` |
| CAN signals | PascalCase | `EngineRPM` |
