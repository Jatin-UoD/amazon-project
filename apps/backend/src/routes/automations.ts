import { FastifyInstance } from "fastify";
import { prisma } from "../index";
import { createAutomationSchema } from "@homepilot/shared";

async function requireMembership(userId: string, householdId: string) {
  return prisma.householdMember.findUnique({
    where: { userId_householdId: { userId, householdId } },
  });
}

export async function automationRoutes(app: FastifyInstance) {
  const auth = { preHandler: [(app as any).authenticate] };

  app.get("/households/:householdId/automations", auth, async (request: any, reply) => {
    const { householdId } = request.params;
    const userId = request.user.sub;
    const membership = await requireMembership(userId, householdId);
    if (!membership) return reply.status(403).send({ error: "Forbidden" });

    return prisma.automationRule.findMany({
      where: { householdId },
      orderBy: { createdAt: "desc" },
      include: { logs: { take: 5, orderBy: { createdAt: "desc" } } },
    });
  });

  app.post("/households/:householdId/automations", auth, async (request: any, reply) => {
    const { householdId } = request.params;
    const userId = request.user.sub;
    const membership = await requireMembership(userId, householdId);
    if (!membership || membership.role === "GUEST") {
      return reply.status(403).send({ error: "Forbidden" });
    }
    const body = createAutomationSchema.parse(request.body);
    return prisma.automationRule.create({
      data: {
        householdId,
        name: body.name,
        enabled: body.enabled,
        trigger: body.trigger,
        actions: body.actions,
        cooldownSeconds: body.cooldownSeconds ?? 60,
      },
    });
  });

  app.patch("/automations/:id", auth, async (request: any, reply) => {
    const { id } = request.params;
    const userId = request.user.sub;
    const rule = await prisma.automationRule.findUnique({ where: { id } });
    if (!rule) return reply.status(404).send({ error: "Not found" });
    const membership = await requireMembership(userId, rule.householdId);
    if (!membership || membership.role === "GUEST") {
      return reply.status(403).send({ error: "Forbidden" });
    }
    const body = request.body as any;
    return prisma.automationRule.update({
      where: { id },
      data: {
        name: body.name,
        enabled: body.enabled,
        trigger: body.trigger,
        actions: body.actions,
        cooldownSeconds: body.cooldownSeconds,
      },
    });
  });

  app.delete("/automations/:id", auth, async (request: any, reply) => {
    const { id } = request.params;
    const userId = request.user.sub;
    const rule = await prisma.automationRule.findUnique({ where: { id } });
    if (!rule) return reply.status(404).send({ error: "Not found" });
    const membership = await requireMembership(userId, rule.householdId);
    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return reply.status(403).send({ error: "Forbidden" });
    }
    await prisma.automationRule.delete({ where: { id } });
    return { ok: true };
  });
}
