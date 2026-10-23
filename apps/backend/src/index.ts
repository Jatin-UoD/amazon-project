import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { PrismaClient } from "@prisma/client";
import { ZodError } from "zod";
import { authRoutes } from "./routes/auth";
import { householdRoutes } from "./routes/households";
import { deviceRoutes } from "./routes/devices";
import { energyRoutes } from "./routes/energy";
import { automationRoutes } from "./routes/automations";
import { aiRoutes } from "./routes/ai";
import { ringRoutes } from "./routes/ring";
import { notificationRoutes } from "./routes/notifications";
import { mqttService } from "./mqtt/client";
import { automationEngine } from "./services/automationEngine";

export const prisma = new PrismaClient();

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
  },
});

async function bootstrap() {
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN === "*" ? true : process.env.CORS_ORIGIN?.split(","),
  });

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET is required in production");
    }
    console.warn("[auth] JWT_SECRET is not set — using a dev-only secret");
  }

  await app.register(jwt, {
    secret: jwtSecret || "dev-only-not-for-production",
  });

  await app.register(rateLimit, {
    max: 200,
    timeWindow: "1 minute",
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "HomePilot API",
        description: "One Home. One App. Total Control.",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
  });

  // Decorate request with user
  app.decorate("authenticate", async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  });

  // Health
  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    mqtt: mqttService.isConnected(),
  }));

  app.get("/ready", async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "ready", mqtt: mqttService.isConnected() };
    } catch {
      return reply.status(503).send({ status: "not_ready" });
    }
  });

  // Routes
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(householdRoutes, { prefix: "/api/households" });
  await app.register(deviceRoutes, { prefix: "/api" });
  await app.register(energyRoutes, { prefix: "/api" });
  await app.register(automationRoutes, { prefix: "/api" });
  await app.register(aiRoutes, { prefix: "/api/ai" });
  await app.register(ringRoutes, { prefix: "/api/ring" });
  await app.register(notificationRoutes, { prefix: "/api" });

  // Handlers first so early messages are not dropped, then connect without blocking listen.
  mqttService.onDeviceAck(async (ack) => {
    await prisma.command.updateMany({
      where: { id: ack.commandId },
      data: {
        status: ack.success ? "EXECUTED" : "FAILED",
        error: ack.error || null,
      },
    });
  });

  mqttService.onDeviceState(async (msg) => {
    await prisma.device.updateMany({
      where: { id: msg.deviceId },
      data: {
        state: msg.state,
        online: true,
        lastSeenAt: new Date(),
      },
    });
  });

  mqttService.onEnergyReading(async (reading) => {
    await prisma.energyReading.create({
      data: {
        householdId: reading.householdId,
        meterId: reading.meterId,
        deviceId: reading.deviceId || null,
        voltageV: reading.voltageV,
        currentA: reading.currentA,
        powerW: reading.powerW,
        energyKwh: reading.energyKwh,
        frequencyHz: reading.frequencyHz,
        powerFactor: reading.powerFactor,
        source: "simulated",
        recordedAt: new Date(reading.recordedAt),
      },
    });
  });

  app.setErrorHandler((err, request, reply) => {
    if (err instanceof ZodError) {
      return reply.status(400).send({
        error: "Invalid request",
        details: err.flatten(),
      });
    }
    request.log.error(err);
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    return reply.status(status).send({
      error: status >= 500 ? "Internal error" : err.message,
    });
  });

  automationEngine.start();
  void mqttService.connect();

  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || "0.0.0.0";
  await app.listen({ port, host });
  console.log(`HomePilot API listening on http://${host}:${port}`);
  console.log(`Swagger docs: http://${host}:${port}/docs`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await mqttService.disconnect();
  await prisma.$disconnect();
  process.exit(0);
});
