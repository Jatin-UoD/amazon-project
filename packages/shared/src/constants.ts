export const ROLES = ["OWNER", "ADMIN", "MEMBER", "GUEST"] as const;
export type Role = (typeof ROLES)[number];

export const DEVICE_TYPES = [
  "LIGHT",
  "SWITCH",
  "FAN",
  "AC",
  "TV",
  "SMART_PLUG",
  "CURTAIN",
  "GEYSER",
  "WASHING_MACHINE",
  "WATER_PUMP",
  "SENSOR_MOTION",
  "SENSOR_DOOR",
  "SENSOR_TEMP_HUMIDITY",
  "SENSOR_WATER_LEVEL",
  "ENERGY_METER",
  "CONTROLLER",
] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export const CAPABILITIES = [
  "on_off",
  "brightness",
  "color",
  "color_temp",
  "fan_speed",
  "temperature_setpoint",
  "ac_mode",
  "ac_fan_mode",
  "position",
  "media_control",
  "power_metering",
  "water_level",
  "pump_control",
  "motion",
  "contact",
  "temperature",
  "humidity",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

export const COMMAND_STATUS = [
  "PENDING",
  "SENT",
  "ACKNOWLEDGED",
  "EXECUTED",
  "FAILED",
  "TIMEOUT",
  "REJECTED",
] as const;
export type CommandStatus = (typeof COMMAND_STATUS)[number];

export const MQTT_TOPICS = {
  deviceCommand: (householdId: string, deviceId: string) =>
    `hp/${householdId}/devices/${deviceId}/command`,
  deviceState: (householdId: string, deviceId: string) =>
    `hp/${householdId}/devices/${deviceId}/state`,
  deviceAck: (householdId: string, deviceId: string) =>
    `hp/${householdId}/devices/${deviceId}/ack`,
  deviceHeartbeat: (householdId: string, deviceId: string) =>
    `hp/${householdId}/devices/${deviceId}/heartbeat`,
  energyReading: (householdId: string, meterId: string) =>
    `hp/${householdId}/energy/${meterId}/reading`,
  householdEvents: (householdId: string) => `hp/${householdId}/events`,
} as const;

export const DEFAULT_TARIFF_INR_PER_KWH = 8.5;
