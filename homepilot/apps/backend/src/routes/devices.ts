import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../index";
import { deviceCommandSchema, createDeviceSchema } from "@homepilot/shared";
import { mqttService } from "../mqtt/client";
import { v4 as uuidv4 } from "uuid";

async function requireMembership(userId: string, householdId: string) {
  return prisma.householdMember.findUnique({
    where: { userId_householdId: { userId, householdId } },
  });
}

export async function deviceRoutes(app: FastifyInstance) {
  const auth = { preHandler: [(app as any).authenticate] };

  // List devices
  app.get("/households/:householdId/devices", auth, async (request: any, reply) => {
    const { householdId } = request.params;
    const userId = request.user.sub;
    const membership = await requireMembership(userId, householdId);
    if (!membership) return reply.status(403).send({ error: "Forbidden" });

    const devices = await prisma.device.findMany({
      where: { householdId },
      orderBy: { name: "asc" },
    });
    return devices;
  });

  // Get single device
  app.get("/devices/:deviceId", auth, async (request: any, reply) => {
    const { deviceId } = request.params;
    const userId = request.user.sub;
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) return reply.status(404).send({ error: "Not found" });
    const membership = await requireMembership(userId, device.householdId);
    if (!membership) return reply.status(403).send({ error: "Forbidden" });
    return device;
  });

  // Create device (pairing / admin)
  app.post("/households/:householdId/devices", auth, async (request: any, reply) => {
    const { householdId } = request.params;
    const userId = request.user.sub;
    const membership = await requireMembership(userId, householdId);
    if (!membership || membership.role === "GUEST") {
      return reply.status(403).send({ error: "Forbidden" });
    }
    const body = createDeviceSchema.parse(request.body);
    const device = await prisma.device.create({
      data: {
        householdId,
        name: body.name,
        type: body.type as any,
        roomId: body.roomId ?? null,
        integration: body.integration as any,
        isSimulated: body.isSimulated ?? true,
        capabilities: body.capabilities ?? defaultCapabilities(body.type),
        state: defaultState(body.type),
        online: body.isSimulated ?? true,
        lastSeenAt: new Date(),
      },
    });
    return device;
  });

  // Send command
  app.post("/devices/:deviceId/command", auth, async (request: any, reply) => {
    const { deviceId } = request.params;
    const userId = request.user.sub;
    const body = deviceCommandSchema.parse(request.body);

    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) return reply.status(404).send({ error: "Device not found" });

    const membership = await requireMembership(userId, device.householdId);
    if (!membership) return reply.status(403).send({ error: "Forbidden" });
    if (membership.role === "GUEST") {
      return reply.status(403).send({ error: "Guests cannot control devices" });
    }

    // Capability check
    const caps = (device.capabilities as any[]) || [];
    const hasCap = caps.some((c) => c.capability === body.capability);
    if (!hasCap) {
      return reply.status(400).send({
        error: `Device does not support capability: ${body.capability}`,
        supported: caps.map((c) => c.capability),
      });
    }

    if (!device.online && !device.isSimulated) {
      return reply.status(503).send({ error: "Device offline" });
    }

    const commandId = uuidv4();
    const command = await prisma.command.create({
      data: {
        id: commandId,
        householdId: device.householdId,
        deviceId,
        capability: body.capability,
        payload: body.payload,
        status: "PENDING",
        requestedBy: userId,
      },
    });

    // Optimistic local state update for simulator / offline-tolerant UI
    const newState = applyCommandToState(device.state as Record<string, unknown>, body.capability, body.payload);
    await prisma.device.update({
      where: { id: deviceId },
      data: { state: newState },
    });

    // Publish to MQTT
    mqttService.publishCommand(device.householdId, deviceId, {
      commandId,
      capability: body.capability,
      payload: body.payload,
    });

    await prisma.command.update({
      where: { id: commandId },
      data: { status: "SENT" },
    });

    // Activity log
    await prisma.activityLog.create({
      data: {
        householdId: device.householdId,
        actorId: userId,
        action: "device.command",
        entityType: "device",
        entityId: deviceId,
        metadata: { capability: body.capability, payload: body.payload },
      },
    });

    return {
      commandId,
      status: "SENT",
      device: { ...device, state: newState },
    };
  });

  // Command status
  app.get("/commands/:commandId", auth, async (request: any, reply) => {
    const { commandId } = request.params;
    const userId = request.user.sub;
    const cmd = await prisma.command.findUnique({ where: { id: commandId } });
    if (!cmd) return reply.status(404).send({ error: "Not found" });
    const membership = await requireMembership(userId, cmd.householdId);
    if (!membership) return reply.status(403).send({ error: "Forbidden" });
    return cmd;
  });
}

function defaultCapabilities(type: string) {
  const map: Record<string, any[]> = {
    LIGHT: [
      { capability: "on_off" },
      { capability: "brightness", min: 0, max: 100, step: 1 },
      { capability: "color_temp", min: 2700, max: 6500 },
    ],
    SWITCH: [{ capability: "on_off" }],
    FAN: [
      { capability: "on_off" },
      { capability: "fan_speed", min: 0, max: 5, step: 1 },
    ],
    AC: [
      { capability: "on_off" },
      { capability: "temperature_setpoint", min: 16, max: 30, step: 1 },
      { capability: "ac_mode", options: ["cool", "heat", "fan", "dry", "auto"] },
      { capability: "ac_fan_mode", options: ["auto", "low", "medium", "high"] },
    ],
    TV: [
      { capability: "on_off" },
      { capability: "media_control", options: ["play", "pause", "volume_up", "volume_down", "mute"] },
    ],
    SMART_PLUG: [{ capability: "on_off" }, { capability: "power_metering" }],
    CURTAIN: [{ capability: "position", min: 0, max: 100, step: 5 }],
    GEYSER: [{ capability: "on_off" }],
    WATER_PUMP: [{ capability: "on_off" }, { capability: "pump_control" }],
    SENSOR_WATER_LEVEL: [{ capability: "water_level" }],
    ENERGY_METER: [{ capability: "power_metering" }],
    SENSOR_MOTION: [{ capability: "motion" }],
    SENSOR_DOOR: [{ capability: "contact" }],
    SENSOR_TEMP_HUMIDITY: [{ capability: "temperature" }, { capability: "humidity" }],
  };
  return map[type] || [{ capability: "on_off" }];
}

function defaultState(type: string): Record<string, unknown> {
  const map: Record<string, Record<string, unknown>> = {
    LIGHT: { on: false, brightness: 80, colorTemp: 4000 },
    SWITCH: { on: false },
    FAN: { on: false, speed: 0 },
    AC: { on: false, temperature: 24, mode: "cool", fanMode: "auto" },
    TV: { on: false, volume: 20, muted: false },
    SMART_PLUG: { on: false },
    CURTAIN: { position: 0 },
    GEYSER: { on: false },
    WATER_PUMP: { on: false },
    SENSOR_WATER_LEVEL: { levelPercent: 65 },
    ENERGY_METER: { powerW: 0, energyKwh: 0 },
    SENSOR_MOTION: { motion: false },
    SENSOR_DOOR: { contact: true },
    SENSOR_TEMP_HUMIDITY: { temperature: 26.5, humidity: 55 },
  };
  return map[type] || { on: false };
}

function applyCommandToState(
  state: Record<string, unknown>,
  capability: string,
  payload: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...state };
  switch (capability) {
    case "on_off":
      next.on = Boolean(payload.on ?? payload.value ?? !state.on);
      if (next.on === false && "speed" in next) next.speed = 0;
      break;
    case "brightness":
      next.brightness = Number(payload.value ?? payload.brightness ?? 80);
      next.on = true;
      break;
    case "fan_speed":
      next.speed = Number(payload.value ?? payload.speed ?? 1);
      next.on = next.speed > 0;
      break;
    case "temperature_setpoint":
      next.temperature = Number(payload.value ?? payload.temperature ?? 24);
      break;
    case "ac_mode":
      next.mode = String(payload.value ?? payload.mode ?? "cool");
      break;
    case "ac_fan_mode":
      next.fanMode = String(payload.value ?? payload.fanMode ?? "auto");
      break;
    case "position":
      next.position = Number(payload.value ?? payload.position ?? 0);
      break;
    case "color_temp":
      next.colorTemp = Number(payload.value ?? 4000);
      break;
    default:
      Object.assign(next, payload);
  }
  return next;
}
