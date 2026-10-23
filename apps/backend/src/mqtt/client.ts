import mqtt, { MqttClient } from "mqtt";
import { EventEmitter } from "events";

interface DeviceAck {
  commandId: string;
  deviceId: string;
  householdId: string;
  success: boolean;
  error?: string;
}

interface DeviceStateMsg {
  deviceId: string;
  householdId: string;
  state: Record<string, unknown>;
}

interface EnergyReadingMsg {
  householdId: string;
  meterId: string;
  deviceId?: string;
  voltageV?: number;
  currentA?: number;
  powerW?: number;
  energyKwh?: number;
  frequencyHz?: number;
  powerFactor?: number;
  recordedAt: string;
}

class MqttService extends EventEmitter {
  private client: MqttClient | null = null;
  private connected = false;

  async connect(): Promise<void> {
    const url = process.env.MQTT_URL || "mqtt://localhost:1883";
    return new Promise((resolve) => {
      this.client = mqtt.connect(url, {
        clientId: process.env.MQTT_CLIENT_ID || `homepilot-backend-${Date.now()}`,
        username: process.env.MQTT_USERNAME || undefined,
        password: process.env.MQTT_PASSWORD || undefined,
        reconnectPeriod: 3000,
      });

      this.client.on("connect", () => {
        this.connected = true;
        console.log("[MQTT] Connected");
        this.client?.subscribe("hp/+/devices/+/ack");
        this.client?.subscribe("hp/+/devices/+/state");
        this.client?.subscribe("hp/+/devices/+/heartbeat");
        this.client?.subscribe("hp/+/energy/+/reading");
        resolve();
      });

      this.client.on("message", (topic, payload) => {
        try {
          const data = JSON.parse(payload.toString());
          const parts = topic.split("/");
          // hp/{householdId}/devices/{deviceId}/ack|state|heartbeat
          // hp/{householdId}/energy/{meterId}/reading
          if (parts[3] === "devices") {
            const householdId = parts[1];
            const deviceId = parts[3] === "devices" ? parts[3] : parts[3];
            // fix parsing
          }
          if (topic.includes("/ack")) {
            this.emit("deviceAck", data as DeviceAck);
          } else if (topic.includes("/state")) {
            this.emit("deviceState", data as DeviceStateMsg);
          } else if (topic.includes("/heartbeat")) {
            this.emit("heartbeat", data);
          } else if (topic.includes("/energy/") && topic.endsWith("/reading")) {
            this.emit("energyReading", data as EnergyReadingMsg);
          }
        } catch (e) {
          console.error("[MQTT] Bad message", e);
        }
      });

      this.client.on("error", (err) => {
        console.error("[MQTT] Error", err.message);
        this.connected = false;
      });

      this.client.on("close", () => {
        this.connected = false;
      });

      // Resolve even if broker not up yet (reconnect will handle)
      setTimeout(resolve, 2000);
    });
  }

  isConnected(): boolean {
    return this.connected;
  }

  publishCommand(
    householdId: string,
    deviceId: string,
    command: { commandId: string; capability: string; payload: Record<string, unknown> }
  ): void {
    if (!this.client) return;
    const topic = `hp/${householdId}/devices/${deviceId}/command`;
    this.client.publish(topic, JSON.stringify(command), { qos: 1 });
  }

  onDeviceAck(handler: (ack: DeviceAck) => void): void {
    this.on("deviceAck", handler);
  }

  onDeviceState(handler: (msg: DeviceStateMsg) => void): void {
    this.on("deviceState", handler);
  }

  onEnergyReading(handler: (msg: EnergyReadingMsg) => void): void {
    this.on("energyReading", handler);
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.client) {
        this.client.end(false, {}, () => resolve());
      } else {
        resolve();
      }
    });
  }
}

export const mqttService = new MqttService();
