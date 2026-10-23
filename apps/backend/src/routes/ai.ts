import { FastifyInstance } from "fastify";
import { aiChatSchema } from "@homepilot/shared";
import { prisma } from "../index";
import { interpretCommand } from "../ai/interpreter";
import { mqttService } from "../mqtt/client";
import { v4 as uuidv4 } from "uuid";

async function requireMembership(userId: string, householdId: string) {
  return prisma.householdMember.findUnique({
    where: { userId_householdId: { userId, householdId } },
  });
}

export async function aiRoutes(app: FastifyInstance) {
  const auth = { preHandler: [(app as any).authenticate] };

  app.post("/chat", auth, async (request: any, reply) => {
    const body = aiChatSchema.parse(request.body);
    const userId = request.user.sub;
    const householdId = (request.body as any).householdId as string | undefined;

    if (!householdId) {
      return reply.status(400).send({ error: "householdId required" });
    }
    const membership = await requireMembership(userId, householdId);
    if (!membership) return reply.status(403).send({ error: "Forbidden" });

    // Load context
    const devices = await prisma.device.findMany({
      where: { householdId },
      include: { room: true },
    });
    const rooms = await prisma.room.findMany({ where: { householdId } });

    const intent = await interpretCommand(body.message, {
      devices: devices.map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        room: d.room?.name,
        capabilities: d.capabilities,
        state: d.state,
      })),
      rooms: rooms.map((r) => r.name),
    });

    if (intent.needsClarification) {
      return {
        type: "clarification",
        message: intent.clarificationQuestion || "Could you clarify?",
        intent,
      };
    }

    if (intent.requiresConfirmation) {
      return {
        type: "confirmation_required",
        message: `Please confirm: ${intent.action}`,
        intent,
      };
    }

    // Execute if we have a clear device command
    const results: any[] = [];
    if (intent.action === "device_command" && intent.targets?.length) {
      for (const target of intent.targets) {
        let device = devices.find(
          (d) =>
            (target.device && d.name.toLowerCase().includes(target.device.toLowerCase())) ||
            (target.room && d.room?.name.toLowerCase() === target.room.toLowerCase() && target.type && d.type === target.type) ||
            (target.room && !target.device && d.room?.name.toLowerCase() === target.room.toLowerCase() && d.type === "LIGHT")
        );
        if (!device && target.device) {
          device = devices.find((d) => d.name.toLowerCase().includes(String(target.device).toLowerCase()));
        }
        if (!device) {
          results.push({ error: `Device not found for target`, target });
          continue;
        }

        const capability = (intent.parameters?.capability as string) || "on_off";
        const payload = (intent.parameters?.payload as Record<string, unknown>) || { on: true };

        const caps = (device.capabilities as any[]) || [];
        if (!caps.some((c) => c.capability === capability)) {
          results.push({
            error: `Unsupported capability ${capability} on ${device.name}`,
            deviceId: device.id,
          });
          continue;
        }

        const commandId = uuidv4();
        await prisma.command.create({
          data: {
            id: commandId,
            householdId,
            deviceId: device.id,
            capability,
            payload,
            status: "SENT",
            requestedBy: userId,
          },
        });
        mqttService.publishCommand(householdId, device.id, {
          commandId,
          capability,
          payload,
        });
        results.push({ commandId, deviceId: device.id, deviceName: device.name, capability, payload });
      }

      return {
        type: "executed",
        message: results.every((r) => !r.error)
          ? `Done. ${results.map((r) => r.deviceName).join(", ")} updated.`
          : "Some commands could not be executed.",
        results,
        intent,
        aiAvailable: intent.confidence > 0,
      };
    }

    if (intent.action === "query_energy") {
      // Return summary pointer
      return {
        type: "info",
        message: "Open the Energy Analytics screen for detailed usage, or ask for a specific period.",
        intent,
      };
    }

    return {
      type: "message",
      message: intent.parameters?.reply || "I understood your request but could not map it to a supported action.",
      intent,
    };
  });

  app.get("/status", auth, async () => {
    const provider = process.env.AI_PROVIDER || "none";
    return {
      provider,
      model: process.env.AI_MODEL || null,
      available: provider !== "none" && Boolean(process.env.AI_ENDPOINT),
      fallback: "rule-based",
      note: "Core device controls work without AI.",
    };
  });
}
