import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../index";
import { loginSchema, registerSchema } from "@homepilot/shared";

export async function authRoutes(app: FastifyInstance) {
  app.post("/register", async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return reply.status(409).send({ error: "Email already registered" });
    }
    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        name: body.name,
      },
    });
    const token = app.jwt.sign({ sub: user.id, email: user.email });
    return {
      token,
      user: { id: user.id, email: user.email, name: user.name },
    };
  });

  app.post("/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }
    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }
    const token = app.jwt.sign({ sub: user.id, email: user.email });
    return {
      token,
      user: { id: user.id, email: user.email, name: user.name },
    };
  });

  app.get(
    "/me",
    { preHandler: [(app as any).authenticate] },
    async (request: any) => {
      const userId = request.user.sub;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          memberships: {
            include: {
              household: { select: { id: true, name: true } },
            },
          },
        },
      });
      return user;
    }
  );
}
