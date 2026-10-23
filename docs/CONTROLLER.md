# Central IoT Controller Interface

## Protocol

All controllers (ESP32-class or software simulator) speak MQTT:

```
hp/{householdId}/devices/{deviceId}/command   ← backend → device
hp/{householdId}/devices/{deviceId}/state     ← device → backend
hp/{householdId}/devices/{deviceId}/ack       ← device → backend
hp/{householdId}/devices/{deviceId}/heartbeat ← device → backend
hp/{householdId}/energy/{meterId}/reading     ← meter → backend
```

### Command payload

```json
{
  "commandId": "uuid",
  "capability": "on_off",
  "payload": { "on": true }
}
```

### ACK payload

```json
{
  "commandId": "uuid",
  "deviceId": "...",
  "householdId": "...",
  "success": true,
  "error": null
}
```

### State payload

```json
{
  "deviceId": "...",
  "householdId": "...",
  "state": { "on": true, "brightness": 80 }
}
```

## Security

- Do not expose the MQTT broker to the public internet without TLS + authentication.
- Topic ACLs should restrict each controller to its household prefix.
- Firmware updates must be signed; reject unsigned images.
- Independent hardware interlocks (thermal cutouts, overflow float switches) must remain effective without cloud connectivity.

## Simulator

`npm run simulator` implements the same topics and is suitable for demos and CI.
