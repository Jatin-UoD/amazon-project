import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding HomePilot demo data...");

  const passwordHash = await bcrypt.hash("HomePilot2024!", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@homepilot.app" },
    update: {},
    create: {
      email: "demo@homepilot.app",
      passwordHash,
      name: "Demo User",
    },
  });

  // Clean previous demo household devices if re-seeding
  const existing = await prisma.householdMember.findFirst({
    where: { userId: user.id },
    include: { household: true },
  });

  let householdId: string;
  let rooms: { id: string; name: string }[] = [];

  if (existing) {
    householdId = existing.householdId;
    rooms = await prisma.room.findMany({ where: { householdId } });
    console.log("Using existing household:", householdId);
  } else {
    const household = await prisma.household.create({
      data: {
        name: "Demo Home",
        tariffInrPerKwh: 8.5,
        members: {
          create: { userId: user.id, role: "OWNER" },
        },
        rooms: {
          create: [
            { name: "Living Room", icon: "sofa", sortOrder: 0 },
            { name: "Bedroom", icon: "bed", sortOrder: 1 },
            { name: "Kitchen", icon: "chef-hat", sortOrder: 2 },
            { name: "Utility", icon: "wrench", sortOrder: 3 },
          ],
        },
      },
      include: { rooms: true },
    });
    householdId = household.id;
    rooms = household.rooms;
  }

  const living = rooms.find((r) => r.name === "Living Room")!;
  const bedroom = rooms.find((r) => r.name === "Bedroom")!;
  const kitchen = rooms.find((r) => r.name === "Kitchen")!;
  const utility = rooms.find((r) => r.name === "Utility")!;

  // Clear old devices for clean seed
  await prisma.device.deleteMany({ where: { householdId } });
  await prisma.energyReading.deleteMany({ where: { householdId } });
  await prisma.automationRule.deleteMany({ where: { householdId } });

  const devices = [
    {
      name: "Living Light",
      type: "LIGHT" as const,
      roomId: living.id,
      capabilities: [
        { capability: "on_off" },
        { capability: "brightness", min: 0, max: 100, step: 1 },
        { capability: "color_temp", min: 2700, max: 6500 },
      ],
      state: { on: true, brightness: 70, colorTemp: 4000 },
    },
    {
      name: "Living Fan",
      type: "FAN" as const,
      roomId: living.id,
      capabilities: [
        { capability: "on_off" },
        { capability: "fan_speed", min: 0, max: 5, step: 1 },
      ],
      state: { on: true, speed: 3 },
    },
    {
      name: "Living AC",
      type: "AC" as const,
      roomId: living.id,
      capabilities: [
        { capability: "on_off" },
        { capability: "temperature_setpoint", min: 16, max: 30, step: 1 },
        { capability: "ac_mode", options: ["cool", "heat", "fan", "dry", "auto"] },
        { capability: "ac_fan_mode", options: ["auto", "low", "medium", "high"] },
      ],
      state: { on: true, temperature: 24, mode: "cool", fanMode: "auto" },
    },
    {
      name: "TV",
      type: "TV" as const,
      roomId: living.id,
      capabilities: [
        { capability: "on_off" },
        { capability: "media_control", options: ["play", "pause", "volume_up", "volume_down", "mute"] },
      ],
      state: { on: false, volume: 15, muted: false },
    },
    {
      name: "Bedroom Light",
      type: "LIGHT" as const,
      roomId: bedroom.id,
      capabilities: [
        { capability: "on_off" },
        { capability: "brightness", min: 0, max: 100, step: 1 },
      ],
      state: { on: false, brightness: 50 },
    },
    {
      name: "Bedroom Fan",
      type: "FAN" as const,
      roomId: bedroom.id,
      capabilities: [
        { capability: "on_off" },
        { capability: "fan_speed", min: 0, max: 5, step: 1 },
      ],
      state: { on: false, speed: 0 },
    },
    {
      name: "Kitchen Light",
      type: "LIGHT" as const,
      roomId: kitchen.id,
      capabilities: [{ capability: "on_off" }, { capability: "brightness", min: 0, max: 100 }],
      state: { on: true, brightness: 100 },
    },
    {
      name: "Coffee Plug",
      type: "SMART_PLUG" as const,
      roomId: kitchen.id,
      capabilities: [{ capability: "on_off" }, { capability: "power_metering" }],
      state: { on: false },
    },
    {
      name: "Curtain",
      type: "CURTAIN" as const,
      roomId: living.id,
      capabilities: [{ capability: "position", min: 0, max: 100, step: 5 }],
      state: { position: 40 },
    },
    {
      name: "Water Pump",
      type: "WATER_PUMP" as const,
      roomId: utility.id,
      capabilities: [{ capability: "on_off" }, { capability: "pump_control" }],
      state: { on: false },
    },
    {
      name: "Tank Level Sensor",
      type: "SENSOR_WATER_LEVEL" as const,
      roomId: utility.id,
      capabilities: [{ capability: "water_level" }],
      state: { levelPercent: 68 },
    },
    {
      name: "Main Energy Meter",
      type: "ENERGY_METER" as const,
      roomId: utility.id,
      capabilities: [{ capability: "power_metering" }],
      state: { powerW: 1250, energyKwh: 42.5 },
    },
    {
      name: "Geyser",
      type: "GEYSER" as const,
      roomId: utility.id,
      capabilities: [{ capability: "on_off" }],
      state: { on: false },
    },
  ];

  for (const d of devices) {
    await prisma.device.create({
      data: {
        householdId,
        name: d.name,
        type: d.type,
        roomId: d.roomId,
        integration: "simulator",
        isSimulated: true,
        online: true,
        lastSeenAt: new Date(),
        capabilities: d.capabilities,
        state: d.state,
      },
    });
  }

  // Seed some energy history (last 24h)
  const meter = await prisma.device.findFirst({
    where: { householdId, type: "ENERGY_METER" },
  });
  let cumulative = 40;
  const now = Date.now();
  for (let i = 48; i >= 0; i--) {
    const t = new Date(now - i * 30 * 60 * 1000);
    const hour = t.getHours();
    // Higher load evening
    const base = hour >= 18 && hour <= 22 ? 1800 : hour >= 7 && hour <= 9 ? 1200 : 600;
    const powerW = base + Math.random() * 400;
    cumulative += (powerW / 1000) * 0.5; // 30 min interval
    await prisma.energyReading.create({
      data: {
        householdId,
        meterId: meter?.id || "main",
        deviceId: meter?.id,
        voltageV: 230 + (Math.random() - 0.5) * 6,
        currentA: powerW / 230,
        powerW: Math.round(powerW),
        energyKwh: Math.round(cumulative * 1000) / 1000,
        frequencyHz: 50,
        powerFactor: 0.92 + Math.random() * 0.05,
        source: "simulated",
        recordedAt: t,
      },
    });
  }

  // Sample automation
  await prisma.automationRule.create({
    data: {
      householdId,
      name: "Bedtime lights off",
      enabled: true,
      trigger: { type: "schedule", time: "22:30", days: [0, 1, 2, 3, 4, 5, 6] },
      actions: [], // populated after we have device ids in a real flow
      cooldownSeconds: 300,
    },
  });

  await prisma.automationRule.create({
    data: {
      householdId,
      name: "Ring motion → porch light (demo)",
      enabled: true,
      trigger: { type: "ring_event", eventType: "motion" },
      actions: [],
      cooldownSeconds: 120,
    },
  });

  console.log("Seed complete.");
  console.log("Login: demo@homepilot.app / HomePilot2024!");
  console.log("Household ID:", householdId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
