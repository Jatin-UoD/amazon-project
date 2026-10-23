import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../index";
import { createHouseholdSchema, inviteMemberSchema } from "@homepilot/shared";

async function requireMembership(userId: string, householdId: string, minRole?: string) {
  const membership = await prisma.householdMember.findUnique({
    where: { userId_householdId: { userId, householdId } },
  });
  if (!membership) return null;
  return membership;
}

export async function householdRoutes(app: FastifyInstance) {
  const auth = { preHandler: [(app as any).authenticate] };

  app.post("/", auth, async (request: any, reply) => {
    const body = createHouseholdSchema.parse(request.body);
    const userId = request.user.sub;
    const household = await prisma.household.create({
      data: {
        name: body.name,
        members: {
          create: { userId, role: "OWNER" },
        },
        rooms: {
          create: [
            { name: "Living Room", icon: "sofa", sortOrder: 0 },
            { name: "Bedroom", icon: "bed", sortOrder: 1 },
            { name: "Kitchen", icon: "chef-hat", sortOrder: 2 },
          ],
        },
      },
      include: { rooms: true, members: true },
    });
    return household;
  });

  app.get("/", auth, async (request: any) => {
    const userId = request.user.sub;
    const memberships = await prisma.householdMember.findMany({
      where: { userId },
      include: {
        household: {
          include: {
            _count: { select: { devices: true, rooms: true } },
          },
        },
      },
    });
    return memberships.map((m) => ({
      ...m.household,
      role: m.role,
    }));
  });

  app.get("/:householdId", auth, async (request: any, reply) => {
    const { householdId } = request.params;
    const userId = request.user.sub;
    const membership = await requireMembership(userId, householdId);
    if (!membership) return reply.status(403).send({ error: "Forbidden" });

    const household = await prisma.household.findUnique({
      where: { id: householdId },
      include: {
        rooms: { orderBy: { sortOrder: "asc" } },
        members: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
        devices: true,
      },
    });
    return household;
  });

  app.post("/:householdId/invite", auth, async (request: any, reply) => {
    const { householdId } = request.params;
    const userId = request.user.sub;
    const membership = await requireMembership(userId, householdId);
    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return reply.status(403).send({ error: "Forbidden" });
    }
    const body = inviteMemberSchema.parse(request.body);
    const invitee = await prisma.user.findUnique({ where: { email: body.email } });
    if (!invitee) {
      return reply.status(404).send({ error: "User not found. They must register first." });
    }
    const member = await prisma.householdMember.upsert({
      where: {
        userId_householdId: { userId: invitee.id, householdId },
      },
      create: {
        userId: invitee.id,
        householdId,
        role: body.role as any,
      },
      update: { role: body.role as any },
    });
    return member;
  });

  app.get("/:householdId/rooms", auth, async (request: any, reply) => {
    const { householdId } = request.params;
    const userId = request.user.sub;
    const membership = await requireMembership(userId, householdId);
    if (!membership) return reply.status(403).send({ error: "Forbidden" });
    return prisma.room.findMany({
      where: { householdId },
      orderBy: { sortOrder: "asc" },
      include: { devices: true },
    });
  });

  app.post("/:householdId/rooms", auth, async (request: any, reply) => {
    const { householdId } = request.params;
    const userId = request.user.sub;
    const membership = await requireMembership(userId, householdId);
    if (!membership || membership.role === "GUEST") {
      return reply.status(403).send({ error: "Forbidden" });
    }
    const body = z.object({ name: z.string().min(1), icon: z.string().optional() }).parse(request.body);
    return prisma.room.create({
      data: { householdId, name: body.name, icon: body.icon },
    });
  });
}
