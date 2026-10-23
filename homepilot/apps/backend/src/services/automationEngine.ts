import { prisma } from "../index";
import { mqttService } from "../mqtt/client";
import { v4 as uuidv4 } from "uuid";

class AutomationEngine {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  start() {
    if (this.running) return;
    this.running = true;
    // Evaluate time-based rules every 30s
    this.timer = setInterval(() => this.tick(), 30_000);
    console.log("[AutomationEngine] Started");
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.running = false;
  }

  private async tick() {
    try {
      const rules = await prisma.automationRule.findMany({
        where: { enabled: true },
      });
      const now = new Date();
      for (const rule of rules) {
        if (rule.lastTriggeredAt) {
          const elapsed = (now.getTime() - rule.lastTriggeredAt.getTime()) / 1000;
          if (elapsed < (rule.cooldownSeconds || 60)) continue;
        }
        const trigger = rule.trigger as any;
        if (trigger.type === "schedule" && this.matchesSchedule(trigger, now)) {
          await this.execute(rule);
        }
      }
    } catch (e) {
      console.error("[AutomationEngine] tick error", e);
    }
  }

  private matchesSchedule(trigger: any, now: Date): boolean {
    // Simple HH:MM match (local time)
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    if (trigger.time === hhmm) {
      if (trigger.days && Array.isArray(trigger.days)) {
        const day = now.getDay(); // 0=Sun
        return trigger.days.includes(day);
      }
      return true;
    }
    return false;
  }

  async execute(rule: any) {
    const actions = rule.actions as any[];
    let success = true;
    let message = "";
    try {
      for (const action of actions) {
        if (action.type === "device_command") {
          const device = await prisma.device.findUnique({ where: { id: action.deviceId } });
          if (!device) continue;
          const owner = await prisma.householdMember.findFirst({
            where: { householdId: rule.householdId, role: "OWNER" },
          });
          if (!owner) continue;
          const commandId = uuidv4();
          await prisma.command.create({
            data: {
              id: commandId,
              householdId: rule.householdId,
              deviceId: action.deviceId,
              capability: action.capability,
              payload: action.payload || {},
              status: "SENT",
              requestedBy: owner.userId,
            },
          });
          mqttService.publishCommand(rule.householdId, action.deviceId, {
            commandId,
            capability: action.capability,
            payload: action.payload || {},
          });
        }
      }
      message = `Executed ${actions.length} action(s)`;
    } catch (e: any) {
      success = false;
      message = e.message || "Execution failed";
    }

    await prisma.automationRule.update({
      where: { id: rule.id },
      data: { lastTriggeredAt: new Date() },
    });
    await prisma.automationLog.create({
      data: { ruleId: rule.id, success, message },
    });
  }

  /** Called by Ring adapter or sensor events */
  async handleEvent(householdId: string, eventType: string, payload: any) {
    const rules = await prisma.automationRule.findMany({
      where: {
        householdId,
        enabled: true,
      },
    });
    for (const rule of rules) {
      const trigger = rule.trigger as any;
      if (trigger.type === "ring_event" && trigger.eventType === eventType) {
        if (rule.lastTriggeredAt) {
          const elapsed = (Date.now() - rule.lastTriggeredAt.getTime()) / 1000;
          if (elapsed < (rule.cooldownSeconds || 60)) continue;
        }
        await this.execute(rule);
      }
      if (trigger.type === "device_state" && payload.deviceId === trigger.deviceId) {
        // simple match
        await this.execute(rule);
      }
    }
  }
}

export const automationEngine = new AutomationEngine();
