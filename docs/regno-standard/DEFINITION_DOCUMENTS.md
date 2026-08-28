# Regno Standard: Definition Documents

Definition documents describe the structure and interpretation of data without containing actual values. They are reusable across multiple configurations.

---

## ParamDefinitionDoc

Defines properties for a unique parameter instance. Can be reused across multiple configurations.

### Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | String | Yes | - | Regno unique document identifier |
| `type` | Fixed String | No | `ParamDefDoc` | Document type |
| `sourceId` | String | Yes | - | Free-form source identifier |
| `name` | String | Yes | - | Parameter name |
| `description` | String | No | - | Parameter description |
| `groups` | String[] | Yes | - | Array for tree structure generation |
| `units` | String | No | - | Unit description |
| `format` | String | No | - | C-style format string |
| `paramDefDocType` | Fixed String | Yes | `Scalar` | Parameter type |
| `conversion` | ConversionDefDoc | No | - | Conversion definition |
| `signal` | CANSignalDefDoc | No | - | CAN signal info |
| `aliasDefDocs` | AliasDefDoc[] | No | - | Parameter aliases |
| `tags` | TagDoc[] | No | - | Metadata tags |

### Parameter Types

| Type | Description |
|------|-------------|
| `Scalar` | Single value parameter |
| `Array` | Array of values |
| `CAN` | CAN bus parameter |
| `Static` | Static/constant value |

### JSON Example

```json
{
  "id": "param-def-engine-rpm",
  "type": "ParamDefDoc",
  "sourceId": "ECU.Engine.RPM",
  "name": "Engine RPM",
  "description": "Engine rotational speed in revolutions per minute",
  "groups": ["Powertrain", "Engine"],
  "units": "rpm",
  "format": "%.0f",
  "paramDefDocType": "Scalar",
  "conversion": {
    "conversionType": "Rational",
    "coefficients": [0, 1, 0, 1, 0, 0]
  },
  "tags": [
    { "key": "sensor", "value": "crankshaft" },
    { "key": "sample_rate", "value": "1000" }
  ]
}
```

---

## EventDefinitionDoc

Defines properties for event types. Referenced by EventDataDoc.

### Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | String | Yes | - | Regno unique document identifier |
| `type` | Fixed String | No | `EventDefDoc` | Document type |
| `sourceId` | String | Yes | - | Free-form event identifier |
| `name` | String | No | - | Event name |
| `description` | String | No | - | Event description |
| `group` | String | No | - | Event grouping |
| `priority` | Fixed String | No | `UnKnown` | Priority level |
| `eventType` | Fixed String | No | `Event` | Event classification |

### Priority Values

| Priority | Description |
|----------|-------------|
| `High` | Critical/urgent events |
| `Medium` | Standard importance |
| `Low` | Informational |
| `Debug` | Debugging only |
| `UnKnown` | Unclassified |

### Event Types

| Type | Description |
|------|-------------|
| `Event` | Standard event |
| `Error` | Error condition |
| `Annotation` | User annotation |
| `Alert` | Alert/warning |

### JSON Example

```json
{
  "id": "event-def-pit-entry",
  "type": "EventDefDoc",
  "sourceId": "RACE.PIT.ENTRY",
  "name": "Pit Lane Entry",
  "description": "Vehicle entered pit lane",
  "group": "Race Events",
  "priority": "High",
  "eventType": "Event"
}
```

---

## ConvDefinitionDoc (Conversion)

Defines conversion formulas for transforming raw values to engineering units.

### Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | String | Yes | - | Regno unique document identifier |
| `type` | Fixed String | No | `ConversionDefDoc` | Document type |
| `name` | String | No | - | Conversion name |
| `conversionType` | Fixed String | Yes | `Rational` | Conversion method |
| `units` | String | No | - | Output unit |
| `format` | String | No | - | C-style format string |
| `interpolate` | Boolean | No | - | Enable interpolation |
| `coefficients` | Double[] | No | - | Rational conversion coefficients |
| `conversionTable` | Dictionary | No | - | Table lookup conversion |
| `conversions` | Dictionary | No | - | Key/value mappings |

### Conversion Types

| Type | Description |
|------|-------------|
| `Rational` | Polynomial conversion using coefficients |
| `Table` | Lookup table conversion |
| `Text` | Text-based mapping |

### Rational Conversion

The rational conversion uses six coefficients for the formula:

```
                c0 + c1*x + c2*x^2
engineering = -----------------------
                c3 + c4*x + c5*x^2
```

### JSON Example

```json
{
  "id": "conv-rpm-to-hz",
  "type": "ConversionDefDoc",
  "name": "RPM to Hz",
  "conversionType": "Rational",
  "units": "Hz",
  "format": "%.2f",
  "coefficients": [0, 0.0166667, 0, 1, 0, 0]
}
```

---

## CANMessageDefinitionDoc

Defines CAN bus message structure.

### Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | String | Yes | - | Regno unique document identifier |
| `type` | Fixed String | No | `CANMessageDefDoc` | Document type |
| `messageId` | String | Yes | - | CAN message ID |
| `name` | String | Yes | - | Message name |
| `isExtID` | Boolean | No | - | Extended ID format |
| `dLC` | UInt16 | No | - | Data Length Code (0-8 bytes) |
| `transmitter` | String | No | - | Transmitting node |
| `comment` | String | No | - | Documentation |
| `paramDefDocIds` | String[] | Yes | - | Associated parameter definitions |

### JSON Example

```json
{
  "id": "can-msg-engine-status",
  "type": "CANMessageDefDoc",
  "messageId": "0x100",
  "name": "Engine Status",
  "isExtID": false,
  "dLC": 8,
  "transmitter": "ECU",
  "comment": "Engine status and RPM data",
  "paramDefDocIds": [
    "param-def-engine-rpm",
    "param-def-engine-temp"
  ]
}
```

---

## CANSignalDefinitionDoc

Defines individual signals within a CAN message.

### Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | String | Yes | - | Regno unique document identifier |
| `type` | Fixed String | No | `CANSignalDefDoc` | Document type |
| `name` | String | Yes | - | Signal name |
| `startBit` | UInt16 | No | - | Start bit position |
| `length` | UInt16 | No | - | Signal bit length |
| `byteOrder` | Byte | No | - | Byte ordering (0=Intel, 1=Motorola) |
| `valueType` | Fixed String | No | - | Value representation |
| `factor` | Double | No | - | Scaling factor |
| `offset` | Double | No | - | Value offset |
| `minimum` | Double | No | - | Minimum value |
| `maximum` | Double | No | - | Maximum value |
| `unit` | String | No | - | Measurement unit |
| `isInteger` | Boolean | No | - | Integer flag |
| `receiver` | String[] | No | - | Signal receivers |
| `valueTableMap` | Dictionary | No | - | Value mappings |
| `comment` | String | No | - | Documentation |
| `multiplexing` | String | No | - | Multiplex config |
| `initialValue` | Double | No | - | Default value |

### Value Types

| Type | Description |
|------|-------------|
| `Signed` | Signed integer |
| `Unsigned` | Unsigned integer |
| `Float` | Single-precision float |
| `Double` | Double-precision float |
| `IEEEFloat` | IEEE 754 single |
| `IEEEDouble` | IEEE 754 double |

### JSON Example

```json
{
  "id": "can-sig-rpm",
  "type": "CANSignalDefDoc",
  "name": "EngineRPM",
  "startBit": 0,
  "length": 16,
  "byteOrder": 0,
  "valueType": "Unsigned",
  "factor": 0.25,
  "offset": 0,
  "minimum": 0,
  "maximum": 16000,
  "unit": "rpm",
  "isInteger": false,
  "comment": "Engine RPM signal from ECU"
}
```

---

## AliasDefinitionDoc

Defines alternative names for parameters.

### Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | String | Yes | - | Regno unique document identifier |
| `type` | Fixed String | No | `AliasDefDoc` | Document type |
| `alias` | String | Yes | - | Alternative name |
| `sourceId` | String | No | - | Original source identifier |

### JSON Example

```json
{
  "id": "alias-rpm",
  "type": "AliasDefDoc",
  "alias": "N_ENGINE",
  "sourceId": "ECU.Engine.RPM"
}
```
