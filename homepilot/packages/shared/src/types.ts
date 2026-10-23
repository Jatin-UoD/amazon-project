import type { Capability, CommandStatus, DeviceType, Role } from "./constants";

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface HouseholdMember {
  userId: string;
  householdId: string;
  role: Role;
  user?: UserPublic;
}

export interface Room {
  id: string;
  householdId: string;
  name: string;
  icon?: string;
  sortOrder: number;
}

export interface DeviceCapability {
  capability: Capability;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

export interface Device {
  id: string;
  householdId: string;
  roomId: string | null;
  name: string;
  type: DeviceType;
  manufacturer?: string;
  model?: string;
  integration: "simulator" | "mqtt_controller" | "ring" | "manual";
  isSimulated: boolean;
  online: boolean;
  lastSeenAt: string | null;
  capabilities: DeviceCapability[];
  state: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface Command {
  id: string;
  householdId: string;
  deviceId: string;
  capability: string;
  payload: Record<string, unknown>;
  status: CommandStatus;
  requestedBy: string;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export interface EnergyReading {
  id: string;
  householdId: string;
  meterId: string;
  deviceId?: string | null;
  voltageV?: number | null;
  currentA?: number | null;
  powerW?: number | null;
  energyKwh?: number | null;
  frequencyHz?: number | null;
  powerFactor?: number | null;
  source: "measured" | "calculated" | "estimated" | "simulated";
  recordedAt: string;
}

export interface AutomationRule {
  id: string;
  householdId: string;
  name: string;
  enabled: boolean;
  trigger: Record<string, unknown>;
  actions: Array<Record<string, unknown>>;
  cooldownSeconds?: number;
  lastTriggeredAt?: string | null;
}

export interface RingEvent {
  id: string;
  householdId: string;
  deviceId?: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  receivedAt: string;
}

export interface AiIntent {
  action: string;
  targets?: Array<{ room?: string; device?: string; type?: string }>;
  parameters?: Record<string, unknown>;
  confidence: number;
  needsClarification?: boolean;
  clarificationQuestion?: string;
  requiresConfirmation?: boolean;
}
