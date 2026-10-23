import { z } from "zod";
import { CAPABILITIES, DEVICE_TYPES, ROLES } from "./constants";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
});

export const createHouseholdSchema = z.object({
  name: z.string().min(1).max(100),
});

export const deviceCommandSchema = z.object({
  capability: z.enum(CAPABILITIES as unknown as [string, ...string[]]),
  payload: z.record(z.unknown()).default({}),
});

export const createDeviceSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(DEVICE_TYPES as unknown as [string, ...string[]]),
  roomId: z.string().uuid().nullable().optional(),
  integration: z.enum(["simulator", "mqtt_controller", "ring", "manual"]).default("simulator"),
  isSimulated: z.boolean().default(true),
  capabilities: z
    .array(
      z.object({
        capability: z.enum(CAPABILITIES as unknown as [string, ...string[]]),
        min: z.number().optional(),
        max: z.number().optional(),
        step: z.number().optional(),
        options: z.array(z.string()).optional(),
      })
    )
    .optional(),
});

export const createAutomationSchema = z.object({
  name: z.string().min(1).max(100),
  enabled: z.boolean().default(true),
  trigger: z.record(z.unknown()),
  actions: z.array(z.record(z.unknown())).min(1),
  cooldownSeconds: z.number().int().min(0).max(86400).optional(),
});

export const aiChatSchema = z.object({
  message: z.string().min(1).max(1000),
  conversationId: z.string().uuid().optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(ROLES as unknown as [string, ...string[]]).default("MEMBER"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type DeviceCommandInput = z.infer<typeof deviceCommandSchema>;
export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;
export type AiChatInput = z.infer<typeof aiChatSchema>;
