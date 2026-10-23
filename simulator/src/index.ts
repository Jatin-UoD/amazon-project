/**
 * HomePilot Device Simulator
 *
 * Speaks the same MQTT protocol as real ESP32-class controllers.
 * All values are clearly simulated.
 */

import mqtt from "mqtt";
import { randomUUID } from "crypto";

const MQTT_URL = process.env.MQTT_URL || "mqtt://localhost:1883";
const HOUSEHOLD_ID = process.env.HOUSEHOLD_ID || "demo"; // will be overridden after discovering from first command or env
const API_URL = process.env.API_URL || "http://localhost:3000";

// In-memory device state (mirrors what backend seed creates)
interface SimDevice {
  id: string;
  name: string;
  type: string;
  state: Record<string, unknown>;
}

let devices: SimDevice[] = [];
let householdId = process.env.HOUSEHOLD_ID || "";

async function fetchDevices() {
  // Login as demo to get household + devices
  try {
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "demo@homepilot.app", password: "HomePilot2024!" }),
    });
    if (!loginRes.ok) {
      console.warn("[Sim] Backend not ready or seed not run. Retrying in 5s...");
      setTimeout(fetchDevices, 5000);
      return;
    }
    const { token } = (await loginRes.json()) as any;
    const meRes = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const me = (await meRes.json()) as any;
    const hh = me.memberships?.[0]?.household;
    if (!hh) {
      console.warn("[Sim] No household. Run seed first.");
      setTimeout(fetchDevices, 5000);
      return;
    }
    householdId = hh.id;
    const devRes = await fetch(`${API_URL}/api/households/${householdId}/devices`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    devices = ((await devRes.json()) as any[]).map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      state: d.state || {},
    }));
    console.log(`[Sim] Loaded ${devices.length} devices for household ${householdId}`);
    startMqtt();
  } catch (e) {
    console.warn("[Sim] Fetch failed, retrying...", e);
    setTimeout(fetchDevices, 5000);
  }
}

function startMqtt() {
  const client = mqtt.connect(MQTT_URL, {
    clientId: `homepilot-simulator-${randomUUID().slice(0, 8)}`,
  });

  client.on("connect", () => {
    console.log("[Sim] MQTT connected");
    // Subscribe to all device commands for this household
    client.subscribe(`hp/${householdId}/devices/+/command`);
    // Heartbeats
    setInterval(() => {
      for (const d of devices) {
        client.publish(
          `hp/${householdId}/devices/${d.id}/heartbeat`,
          JSON.stringify({
            deviceId: d.id,
            householdId,
            ts: new Date().toISOString(),
            online: true,
          }),
          { qos: 0 }
        );
      }
    }, 30_000);

    // Energy readings every 30s
    let energyKwh = 42.5;
    setInterval(() => {
      const meter = devices.find((d) => d.type === "ENERGY_METER");
      const powerW =
        400 +
        devices
          .filter((d) => d.state.on)
          .reduce((s, d) => {
            if (d.type === "AC") return s + 1200;
            if (d.type === "FAN") return s + 60 * ((d.state.speed as number) || 1);
            if (d.type === "LIGHT") return s + 12 * (((d.state.brightness as number) || 50) / 100);
            if (d.type === "GEYSER") return s + 2000;
            if (d.type === "WATER_PUMP") return s + 750;
            return s + 5;
          }, 0) +
        Math.random() * 80;
      energyKwh += (powerW / 1000) * (30 / 3600);
      const reading = {
        householdId,
        meterId: meter?.id || "main",
        deviceId: meter?.id,
        voltageV: Math.round((230 + (Math.random() - 0.5) * 4) * 10) / 10,
        currentA: Math.round((powerW / 230) * 100) / 100,
        powerW: Math.round(powerW),
        energyKwh: Math.round(energyKwh * 1000) / 1000,
        frequencyHz: 50,
        powerFactor: Math.round((0.93 + Math.random() * 0.04) * 100) / 100,
        recordedAt: new Date().toISOString(),
        source: "simulated",
      };
      client.publish(
        `hp/${householdId}/energy/${meter?.id || "main"}/reading`,
        JSON.stringify(reading),
        { qos: 0 }
      );
      if (meter) {
        meter.state = { powerW: reading.powerW, energyKwh: reading.energyKwh };
      }
    }, 30_000);

    // Water level drift
    setInterval(() => {
      const sensor = devices.find((d) => d.type === "SENSOR_WATER_LEVEL");
      const pump = devices.find((d) => d.type === "WATER_PUMP");
      if (sensor) {
        let level = (sensor.state.levelPercent as number) || 65;
        if (pump?.state.on) {
          level = Math.min(100, level + 2);
        } else {
          level = Math.max(5, level - 0.3);
        }
        sensor.state.levelPercent = Math.round(level * 10) / 10;
        client.publish(
          `hp/${householdId}/devices/${sensor.id}/state`,
          JSON.stringify({
            deviceId: sensor.id,
            householdId,
            state: sensor.state,
          })
        );
      }
    }, 60_000);
  });

  client.on("message", (topic, payload) => {
    try {
      const cmd = JSON.parse(payload.toString());
      const parts = topic.split("/");
      const deviceId = parts[3];
      const device = devices.find((d) => d.id === deviceId);
      if (!device) {
        client.publish(
          `hp/${householdId}/devices/${deviceId}/ack`,
          JSON.stringify({
            commandId: cmd.commandId,
            deviceId,
            householdId,
            success: false,
            error: "Unknown device",
          })
        );
        return;
      }

      // Apply command
      const { capability, payload: p } = cmd;
      switch (capability) {
        case "on_off":
          device.state.on = Boolean(p.on ?? p.value);
          if (!device.state.on && "speed" in device.state) device.state.speed = 0;
          break;
        case "brightness":
          device.state.brightness = Number(p.value ?? p.brightness);
          device.state.on = true;
          break;
        case "fan_speed":
          device.state.speed = Number(p.value ?? p.speed);
          device.state.on = (device.state.speed as number) > 0;
          break;
        case "temperature_setpoint":
          device.state.temperature = Number(p.value ?? p.temperature);
          break;
        case "ac_mode":
          device.state.mode = String(p.value ?? p.mode);
          break;
        case "ac_fan_mode":
          device.state.fanMode = String(p.value ?? p.fanMode);
          break;
        case "position":
          device.state.position = Number(p.value ?? p.position);
          break;
        default:
          Object.assign(device.state, p);
      }

      // ACK
      client.publish(
        `hp/${householdId}/devices/${deviceId}/ack`,
        JSON.stringify({
          commandId: cmd.commandId,
          deviceId,
          householdId,
          success: true,
        }),
        { qos: 1 }
      );

      // State report
      client.publish(
        `hp/${householdId}/devices/${deviceId}/state`,
        JSON.stringify({
          deviceId,
          householdId,
          state: device.state,
        }),
        { qos: 1 }
      );

      console.log(`[Sim] ${device.name}: ${capability}`, p);
    } catch (e) {
      console.error("[Sim] Command error", e);
    }
  });

  client.on("error", (err) => console.error("[Sim] MQTT error", err.message));
}

console.log("HomePilot Device Simulator starting...");
fetchDevices();
