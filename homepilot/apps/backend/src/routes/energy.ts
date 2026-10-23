import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../index";

async function requireMembership(userId: string, householdId: string) {
  return prisma.householdMember.findUnique({
    where: { userId_householdId: { userId, householdId } },
  });
}

export async function energyRoutes(app: FastifyInstance) {
  const auth = { preHandler: [(app as any).authenticate] };

  // Latest readings / live snapshot
  app.get("/households/:householdId/energy/live", auth, async (request: any, reply) => {
    const { householdId } = request.params;
    const userId = request.user.sub;
    const membership = await requireMembership(userId, householdId);
    if (!membership) return reply.status(403).send({ error: "Forbidden" });

    const household = await prisma.household.findUnique({ where: { id: householdId } });
    const latest = await prisma.energyReading.findFirst({
      where: { householdId },
      orderBy: { recordedAt: "desc" },
    });

    // Aggregate last 5 minutes for "live" power estimate
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recent = await prisma.energyReading.findMany({
      where: { householdId, recordedAt: { gte: fiveMinAgo } },
      orderBy: { recordedAt: "desc" },
      take: 60,
    });

    const avgPower =
      recent.length > 0
        ? recent.reduce((s, r) => s + (r.powerW || 0), 0) / recent.length
        : latest?.powerW || 0;

    return {
      live: latest
        ? {
            voltageV: latest.voltageV,
            currentA: latest.currentA,
            powerW: latest.powerW,
            energyKwh: latest.energyKwh,
            frequencyHz: latest.frequencyHz,
            powerFactor: latest.powerFactor,
            source: latest.source,
            recordedAt: latest.recordedAt,
            label: latest.source === "simulated" ? "Simulated" : "Measured",
          }
        : null,
      averagePowerW: Math.round(avgPower * 10) / 10,
      tariffInrPerKwh: household?.tariffInrPerKwh ?? 8.5,
      estimatedCostTodayInr: null as number | null, // filled below
    };
  });

  // Historical series
  app.get("/households/:householdId/energy/history", auth, async (request: any, reply) => {
    const { householdId } = request.params;
    const userId = request.user.sub;
    const membership = await requireMembership(userId, householdId);
    if (!membership) return reply.status(403).send({ error: "Forbidden" });

    const query = z
      .object({
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        interval: z.enum(["raw", "hour", "day"]).default("hour"),
        limit: z.coerce.number().min(1).max(5000).default(500),
      })
      .parse(request.query);

    const from = query.from ? new Date(query.from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const to = query.to ? new Date(query.to) : new Date();

    const readings = await prisma.energyReading.findMany({
      where: {
        householdId,
        recordedAt: { gte: from, lte: to },
      },
      orderBy: { recordedAt: "asc" },
      take: query.limit,
    });

    // Simple aggregation for hour/day
    if (query.interval === "raw") {
      return { readings, interval: "raw" };
    }

    const buckets = new Map<string, { powerSum: number; count: number; energyMax: number; ts: string }>();
    for (const r of readings) {
      const d = new Date(r.recordedAt);
      const key =
        query.interval === "hour"
          ? `${d.toISOString().slice(0, 13)}:00:00.000Z`
          : d.toISOString().slice(0, 10);
      const b = buckets.get(key) || { powerSum: 0, count: 0, energyMax: 0, ts: key };
      b.powerSum += r.powerW || 0;
      b.count += 1;
      b.energyMax = Math.max(b.energyMax, r.energyKwh || 0);
      buckets.set(key, b);
    }

    const series = Array.from(buckets.values()).map((b) => ({
      timestamp: b.ts,
      avgPowerW: Math.round((b.powerSum / b.count) * 10) / 10,
      energyKwh: b.energyMax,
    }));

    return { series, interval: query.interval };
  });

  // Summary / bill estimate
  app.get("/households/:householdId/energy/summary", auth, async (request: any, reply) => {
    const { householdId } = request.params;
    const userId = request.user.sub;
    const membership = await requireMembership(userId, householdId);
    if (!membership) return reply.status(403).send({ error: "Forbidden" });

    const household = await prisma.household.findUnique({ where: { id: householdId } });
    const tariff = household?.tariffInrPerKwh ?? 8.5;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [todayReadings, monthReadings] = await Promise.all([
      prisma.energyReading.findMany({
        where: { householdId, recordedAt: { gte: startOfToday } },
        orderBy: { recordedAt: "asc" },
      }),
      prisma.energyReading.findMany({
        where: { householdId, recordedAt: { gte: startOfMonth } },
        orderBy: { recordedAt: "asc" },
      }),
    ]);

    function energyDelta(readings: typeof todayReadings) {
      if (readings.length < 2) return 0;
      const first = readings[0].energyKwh || 0;
      const last = readings[readings.length - 1].energyKwh || 0;
      return Math.max(0, last - first);
    }

    const todayKwh = energyDelta(todayReadings);
    const monthKwh = energyDelta(monthReadings);

    // Peak power today
    const peak = todayReadings.reduce(
      (max, r) => ((r.powerW || 0) > max ? r.powerW || 0 : max),
      0
    );

    return {
      todayKwh: Math.round(todayKwh * 1000) / 1000,
      monthKwh: Math.round(monthKwh * 1000) / 1000,
      estimatedTodayCostInr: Math.round(todayKwh * tariff * 100) / 100,
      estimatedMonthCostInr: Math.round(monthKwh * tariff * 100) / 100,
      peakPowerW: Math.round(peak),
      tariffInrPerKwh: tariff,
      sourceNote: "Values derived from cumulative meter readings. Simulated data is labelled in live feed.",
    };
  });

  // CSV export
  app.get("/households/:householdId/energy/export", auth, async (request: any, reply) => {
    const { householdId } = request.params;
    const userId = request.user.sub;
    const membership = await requireMembership(userId, householdId);
    if (!membership) return reply.status(403).send({ error: "Forbidden" });

    const readings = await prisma.energyReading.findMany({
      where: { householdId },
      orderBy: { recordedAt: "desc" },
      take: 5000,
    });

    const header = "timestamp,voltage_v,current_a,power_w,energy_kwh,frequency_hz,power_factor,source\n";
    const rows = readings
      .map(
        (r) =>
          `${r.recordedAt.toISOString()},${r.voltageV ?? ""},${r.currentA ?? ""},${r.powerW ?? ""},${r.energyKwh ?? ""},${r.frequencyHz ?? ""},${r.powerFactor ?? ""},${r.source}`
      )
      .join("\n");

    reply.header("Content-Type", "text/csv");
    reply.header("Content-Disposition", `attachment; filename="homepilot-energy-${householdId}.csv"`);
    return header + rows;
  });
}
