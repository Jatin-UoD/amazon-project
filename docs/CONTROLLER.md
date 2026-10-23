# Central IoT Controller Interface

## MQTT Topics

```
hp/{householdId}/devices/{deviceId}/command
hp/{householdId}/devices/{deviceId}/state
hp/{householdId}/devices/{deviceId}/ack
hp/{householdId}/devices/{deviceId}/heartbeat
hp/{householdId}/energy/{meterId}/reading
```

## Command payload

```json
{"commandId": "uuid", "capability": "on_off", "payload": {"on": true}}
```

Simulator (`npm run simulator`) uses the same protocol as real ESP32 controllers.

Do not expose MQTT broker publicly without TLS + auth.
