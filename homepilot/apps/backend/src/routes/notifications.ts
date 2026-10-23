import { FastifyInstance } from "fastify";
import { prisma } from "../index";

export async function notificationRoutes(app: FastifyInstance) {
  const auth = { preHandler: [(app as any).authenticate] };

  app.get("/notifications", auth, async (request: any) => {
    const userId = request.user.sub;
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  });

  app.post("/notifications/:id/read", auth, async (request: any, reply) => {
    const userId = request.user.sub;
    const { id } = request.params;
    const n = await prisma.notification.findFirst({ where: { id, userId } });
    if (!n) return reply.status(404).send({ error: "Not found" });
    return prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  });

  app.get("/households/:householdId/activity", auth, async (request: any, reply) => {
    const { householdId } = request.params;
    const userId = request.user.sub;
    const membership = await prisma.householdMember.findUnique({
      where: { userId_householdId: { userId, householdId } },
    });
    if (!membership) return reply.status(403).send({ error: "Forbidden" });

    return prisma.activityLog.findMany({
      where: { householdId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  });
}
