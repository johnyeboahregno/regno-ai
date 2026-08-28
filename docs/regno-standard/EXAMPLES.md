# Regno Standard: JSON Examples

Complete JSON examples for common Regno Standard use cases.

---

## Complete Dataset Example

A complete motorsport telemetry dataset with all document types:

### 1. ConfigDoc (Root)

```json
{
  "id": "cfg-monaco-fp1-2024",
  "type": "ConfigDoc",
  "name": "Monaco GP Free Practice 1",
  "description": "2024 Monaco Grand Prix - Friday FP1 Session",
  "source": "telemetry_monaco_fp1_2024.bin",
  "startTime": 1705312800000000000,
  "endTime": 1705316400000000000,
  "timeOffset": 0,
  "state": "Historic",
  "sourceType": "Data",
  "subConfigDocs": [
    {
      "id": "sub-ecu-001",
      "type": "SubConfigDoc",
      "name": "ECU Primary",
      "description": "Engine Control Unit telemetry",
      "group": "powertrain",
      "version": 1,
      "state": "Historic",
      "sourceType": "Data",
      "startTime": 1705312800000000000,
      "endTime": 1705316400000000000,
      "tags": [
        { "id": "tag-1", "key": "ecu_version", "value": "2024.1.5" }
      ]
    },
    {
      "id": "sub-chassis-001",
      "type": "SubConfigDoc",
      "name": "Chassis Sensors",
      "description": "Suspension and chassis telemetry",
      "group": "chassis",
      "version": 1,
      "state": "Historic",
      "sourceType": "Data"
    }
  ],
  "identityDocIds": ["id-team-001"],
  "tags": [
    { "id": "tag-circuit", "key": "circuit", "value": "Monaco" },
    { "id": "tag-driver", "key": "driver", "value": "16" },
    { "id": "tag-session", "key": "session_type", "value": "FP1" }
  ]
}
```

### 2. IdentityDoc

```json
{
  "id": "id-team-001",
  "type": "IdentityDoc",
  "tags": {
    "organization": "Scuderia Ferrari",
    "department": "Race Engineering",
    "access_level": "team_only",
    "data_owner": "engineering@ferrari.com"
  }
}
```

### 3. ParamDefinitionDoc (Engine RPM)

```json
{
  "id": "param-def-engine-rpm",
  "type": "ParamDefDoc",
  "sourceId": "ECU.Engine.RPM",
  "name": "Engine RPM",
  "description": "Engine rotational speed from crankshaft sensor",
  "groups": ["Powertrain", "Engine", "Performance"],
  "units": "rpm",
  "format": "%.0f",
  "paramDefDocType": "Scalar",
  "conversion": {
    "id": "conv-rpm",
    "type": "ConversionDefDoc",
    "name": "Raw to RPM",
    "conversionType": "Rational",
    "units": "rpm",
    "format": "%.0f",
    "coefficients": [0, 1, 0, 1, 0, 0]
  },
  "tags": [
    { "id": "tag-sensor", "key": "sensor", "value": "crankshaft_position" },
    { "id": "tag-rate", "key": "sample_rate", "value": "1000" }
  ]
}
```

### 4. ParamDefinitionDoc (Vehicle Speed)

```json
{
  "id": "param-def-vehicle-speed",
  "type": "ParamDefDoc",
  "sourceId": "ECU.Vehicle.Speed",
  "name": "Vehicle Speed",
  "description": "Ground speed from wheel speed sensors",
  "groups": ["Chassis", "Dynamics"],
  "units": "km/h",
  "format": "%.1f",
  "paramDefDocType": "Scalar",
  "tags": [
    { "id": "tag-source", "key": "source", "value": "wheel_speed_average" }
  ]
}
```

### 5. EventDefinitionDoc

```json
{
  "id": "event-def-pit-entry",
  "type": "EventDefDoc",
  "sourceId": "RACE.PIT.ENTRY",
  "name": "Pit Lane Entry",
  "description": "Vehicle crossed pit entry line",
  "group": "Race Events",
  "priority": "High",
  "eventType": "Event"
}
```

### 6. ParamSamplesDoc (Time-Series Data)

```json
{
  "id": "samples-rpm-session-001",
  "type": "ParamSamplesDoc",
  "configDocId": "cfg-monaco-fp1-2024",
  "paramDefDocId": "param-def-engine-rpm",
  "dataType": "Double",
  "startTime": 1705312800000000000,
  "endTime": 1705312801000000000,
  "sampleCount": 1000,
  "min": 850.0,
  "max": 15200.0,
  "sampleTimes": "H4sIAAAAAAAA/+3dB3hT1RsH8O/NTdKkadrsvQdlFBBQnIi...",
  "sampleValues": "H4sIAAAAAAAA/+3dB3hT5RbH8e97k5t0pC0ttLSsAoIoiwLi..."
}
```

### 7. ChannelSamplesDoc (Overview Data)

```json
{
  "id": "channel-rpm-overview",
  "type": "ChannelSamplesDoc",
  "configDocId": "cfg-monaco-fp1-2024",
  "paramDefDocId": "param-def-engine-rpm",
  "startTime": 1705312800000000000,
  "endTime": 1705316400000000000,
  "frequency": 1.0,
  "mins": [850.0, 920.0, 1100.0, 8500.0, 12000.0, 850.0],
  "maxs": [12500.0, 14200.0, 15000.0, 15200.0, 15100.0, 14800.0]
}
```

### 8. ParamScalarValueDoc

```json
{
  "id": "scalar-tire-cold-pressure-fl",
  "type": "ParamScalarValueDoc",
  "configDocId": "cfg-monaco-fp1-2024",
  "paramDefDocId": "param-def-tire-pressure",
  "value": 21.5,
  "time": 1705312700000000000,
  "constant": true
}
```

### 9. EventDataDoc

```json
{
  "id": "event-pit-entry-lap15",
  "type": "EventDataDoc",
  "configDocId": "cfg-monaco-fp1-2024",
  "eventDefDocId": "event-def-pit-entry",
  "time": 1705314523456000000,
  "status": "NORMAL_ENTRY"
}
```

### 10. TimeSpanDoc (Lap Marker)

```json
{
  "id": "timespan-lap-15",
  "type": "TimeSpanDoc",
  "timeSpanType": "Lap",
  "markerType": "Out Lap",
  "number": 15,
  "startTime": 1705314000000000000,
  "endTime": 1705314098234000000,
  "duration": 98234000000,
  "source": "timing-system"
}
```

### 11. StatDoc

```json
{
  "id": "stat-session-best-lap",
  "type": "StatDoc",
  "name": "Session Best Lap",
  "value": 72.456,
  "textValue": "1:12.456"
}
```

### 12. MediaDataDoc

```json
{
  "id": "media-onboard-fp1",
  "type": "MediaDataDoc",
  "configDocId": "cfg-monaco-fp1-2024",
  "name": "Onboard Camera - Driver View",
  "description": "Front-facing helmet camera feed",
  "source": "onboard_monaco_fp1_2024.mp4",
  "mediaType": "Video",
  "offset": 0,
  "offsetConfig": 1705312800000000000,
  "tags": [
    { "id": "tag-cam", "key": "camera_position", "value": "helmet_front" },
    { "id": "tag-res", "key": "resolution", "value": "3840x2160" },
    { "id": "tag-fps", "key": "framerate", "value": "60" }
  ]
}
```

---

## CAN Bus Example

### CANMessageDefinitionDoc

```json
{
  "id": "can-msg-engine-status",
  "type": "CANMessageDefDoc",
  "messageId": "0x100",
  "name": "Engine_Status_1",
  "isExtID": false,
  "dLC": 8,
  "transmitter": "ECU",
  "comment": "Primary engine status message containing RPM and temperature",
  "paramDefDocIds": [
    "param-def-can-rpm",
    "param-def-can-engine-temp"
  ]
}
```

### CANSignalDefinitionDoc

```json
{
  "id": "can-sig-engine-rpm",
  "type": "CANSignalDefDoc",
  "name": "Engine_RPM",
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
  "receiver": ["Dashboard", "Telemetry"],
  "comment": "Engine RPM signal with 0.25 resolution"
}
```

---

## Industrial IoT Example

### Sensor Parameter Definition

```json
{
  "id": "param-def-temp-sensor-001",
  "type": "ParamDefDoc",
  "sourceId": "PLANT.REACTOR.TEMP.001",
  "name": "Reactor Core Temperature",
  "description": "Primary temperature sensor in reactor vessel",
  "groups": ["Plant", "Reactor", "Temperature"],
  "units": "degC",
  "format": "%.2f",
  "paramDefDocType": "Scalar",
  "conversion": {
    "id": "conv-thermocouple-k",
    "type": "ConversionDefDoc",
    "name": "K-Type Thermocouple",
    "conversionType": "Table",
    "units": "degC",
    "format": "%.1f",
    "interpolate": true,
    "conversionTable": {
      "0": -270.0,
      "1000": 0.0,
      "2000": 50.0,
      "3000": 100.0,
      "4000": 200.0
    }
  },
  "tags": [
    { "id": "tag-type", "key": "sensor_type", "value": "thermocouple_k" },
    { "id": "tag-cal", "key": "calibration_date", "value": "2024-01-01" }
  ]
}
```

### Event for Alarm Condition

```json
{
  "id": "event-def-high-temp-alarm",
  "type": "EventDefDoc",
  "sourceId": "ALARM.REACTOR.HIGH_TEMP",
  "name": "High Temperature Alarm",
  "description": "Reactor temperature exceeded safe threshold",
  "group": "Safety Alarms",
  "priority": "High",
  "eventType": "Alert"
}
```

---

## Aerospace Example

### Flight Parameter

```json
{
  "id": "param-def-altitude",
  "type": "ParamDefDoc",
  "sourceId": "ARINC429.ADIRU.ALT",
  "name": "Barometric Altitude",
  "description": "Pressure altitude from ADIRU",
  "groups": ["Flight Data", "Navigation", "Altitude"],
  "units": "ft",
  "format": "%.0f",
  "paramDefDocType": "Scalar",
  "tags": [
    { "id": "tag-source", "key": "source_system", "value": "ADIRU_1" },
    { "id": "tag-rate", "key": "update_rate", "value": "50" }
  ]
}
```

### Flight Phase TimeSpan

```json
{
  "id": "timespan-cruise",
  "type": "TimeSpanDoc",
  "timeSpanType": "Period",
  "markerType": "Cruise Phase",
  "startTime": 1705314000000000000,
  "endTime": 1705320000000000000,
  "duration": 6000000000000,
  "source": "fms"
}
```

---

## Query Examples

### MongoDB: Find all samples for a parameter

```javascript
db.paramSamples.find({
  configDocId: "cfg-monaco-fp1-2024",
  paramDefDocId: "param-def-engine-rpm"
}).sort({ startTime: 1 });
```

### MongoDB: Find events in time range

```javascript
db.eventData.find({
  configDocId: "cfg-monaco-fp1-2024",
  time: {
    $gte: NumberLong("1705314000000000000"),
    $lte: NumberLong("1705315000000000000")
  }
});
```

### MongoDB: Aggregate statistics

```javascript
db.paramSamples.aggregate([
  { $match: { paramDefDocId: "param-def-engine-rpm" } },
  { $group: {
    _id: "$configDocId",
    totalSamples: { $sum: "$sampleCount" },
    overallMin: { $min: "$min" },
    overallMax: { $max: "$max" }
  }}
]);
```
