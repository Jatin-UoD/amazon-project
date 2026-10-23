import { FastifyInstance } from "fastify";
import { prisma } from "../index";
import { automationEngine } from "../services/automationEngine";
import { z } from "zod";

/**
 * Ring Integration Adapter
 *
 * Official docs:
 * - https://developer.ring.com/
 * - https://developer.amazon.com/docs/ring/develop.html
 *
 * This module provides:
 * 1. OAuth skeleton (requires Ring developer credentials)
 * 2. Webhook receiver with signature verification hook
 * 3. Demo event simulator for hackathon demos without real credentials
 *
 * Ring devices are NOT treated as general appliance controllers.
 * Only event ingestion + optional linked automations are supported.
 */

async function requireMembership(userId: string, householdId: string) {
  return prisma.householdMember.findUnique({
    where: { userId_householdId: { userId, householdId } },
  });
}

export async function ringRoutes(app: FastifyInstance) {
  const auth = { preHandler: [(app as any).authenticate] };

  // Status / configuration check
  app.get("/status", auth, async () => {
    const configured = Boolean(process.env.RING_CLIENT_ID && process.env.RING_CLIENT_SECRET);
    return {
      configured,
      oauthReady: configured,
      webhookPath: "/api/ring/webhook",
      demoSimulator: true,
      docs: "See docs/RING_INTEGRATION.md",
      note: configured
        ? "Ring OAuth credentials detected. Complete authorization flow."
        : "No Ring credentials. Use demo event simulator for presentations.",
    };
  });

  // OAuth start (placeholder — requires real client id)
  app.get("/authorize", auth, async (request: any, reply) => {
    const clientId = process.env.RING_CLIENT_ID;
    if (!clientId) {
      return reply.status(501).send({
        error: "Ring developer credentials not configured",
        setup: "Set RING_CLIENT_ID and RING_CLIENT_SECRET. See docs/RING_INTEGRATION.md",
      });
    }
    const redirect = process.env.RING_REDIRECT_URI;
    // Official Ring OAuth authorization URL pattern — verify against current docs
    const url = `https://oauth.ring.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirect || "")}`;
    return { authorizationUrl: url };
  });

  // OAuth callback placeholder
  app.get("/callback", async (request, reply) => {
    const query = request.query as any;
    if (!query.code) {
      return reply.status(400).send({ error: "Missing code" });
    }
    // Token exchange would happen here with RING_CLIENT_SECRET
    // Tokens must be stored encrypted per household — never in mobile app
    return {
      message: "Authorization code received. Token exchange requires server-side implementation with your Ring developer credentials.",
      codeReceived: true,
    };
  });

  // Webhook receiver
  app.post("/webhook", async (request, reply) => {
    // In production: verify Ring signature header using RING_WEBHOOK_SECRET
    const secret = process.env.RING_WEBHOOK_SECRET;
    if (secret) {
      const sig = request.headers["x-ring-signature"] || request.headers["x-hub-signature"];
      // TODO: HMAC verification against raw body when secret is set
      if (!sig) {
        // Soft fail in dev; hard fail in production recommended
        request.log.warn("Ring webhook missing signature");
      }
    }

    const body = request.body as any;
    const eventType = body?.event || body?.type || "unknown";
    const householdId = body?.householdId || body?.metadata?.householdId;

    if (!householdId) {
      // Accept but log — real webhooks need mapping from Ring account → household
      request.log.info({ eventType }, "Ring webhook without household mapping");
      return { received: true, mapped: false };
    }

    const event = await prisma.ringEvent.create({
      data: {
        householdId,
        deviceId: body.deviceId || null,
        eventType,
        payload: body,
      },
    });

    // Notify members
    const members = await prisma.householdMember.findMany({ where: { householdId } });
    for (const m of members) {
      await prisma.notification.create({
        data: {
          userId: m.userId,
          householdId,
          title: "Ring Event",
          body: `${eventType} detected`,
          type: "ring",
          data: { eventId: event.id, eventType },
        },
      });
    }

    // Trigger automations
    await automationEngine.handleEvent(householdId, eventType, body);

    return { received: true, eventId: event.id };
  });

  // List events
  app.get("/households/:householdId/events", auth, async (request: any, reply) => {
    const { householdId } = request.params;
    const userId = request.user.sub;
    const membership = await requireMembership(userId, householdId);
    if (!membership) return reply.status(403).send({ error: "Forbidden" });

    return prisma.ringEvent.findMany({
      where: { householdId },
      orderBy: { receivedAt: "desc" },
      take: 50,
    });
  });

  // Demo event simulator (clearly labelled)
  app.post("/demo/inject", auth, async (request: any, reply) => {
    const body = z
      .object({
        householdId: z.string().uuid(),
        eventType: z.enum(["motion", "ding", "on_demand"]).default("motion"),
        deviceName: z.string().default("Front Door (Demo)"),
      })
      .parse(request.body);

    const userId = request.user.sub;
    const membership = await requireMembership(userId, body.householdId);
    if (!membership) return reply.status(403).send({ error: "Forbidden" });

    const payload = {
      event: body.eventType,
      deviceName: body.deviceName,
      simulated: true,
      label: "DEMO — Not a real Ring event",
      timestamp: new Date().toISOString(),
      householdId: body.householdId,
    };

    const event = await prisma.ringEvent.create({
      data: {
        householdId: body.householdId,
        eventType: body.eventType,
        payload,
      },
    });

    const members = await prisma.householdMember.findMany({
      where: { householdId: body.householdId },
    });
    for (const m of members) {
      await prisma.notification.create({
        data: {
          userId: m.userId,
          householdId: body.householdId,
          title: "Ring Demo Event",
          body: `${body.eventType} at ${body.deviceName} (SIMULATED)`,
          type: "ring_demo",
          data: { eventId: event.id, simulated: true },
        },
      });
    }

    await automationEngine.handleEvent(body.householdId, body.eventType, payload);

    return {
      eventId: event.id,
      simulated: true,
      message: "Demo Ring event injected. This is NOT proof of live Ring API access.",
    };
  });
}
