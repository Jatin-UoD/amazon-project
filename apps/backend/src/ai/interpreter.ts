import type { AiIntent } from "@homepilot/shared";

interface Context {
  devices: Array<{
    id: string;
    name: string;
    type: string;
    room?: string | null;
    capabilities: unknown;
    state: unknown;
  }>;
  rooms: string[];
}

/**
 * AI Interpreter with optional LLM + deterministic rule-based fallback.
 * Never executes hardware directly — returns structured intent only.
 */
export async function interpretCommand(message: string, ctx: Context): Promise<AiIntent> {
  const provider = process.env.AI_PROVIDER;
  if (provider === "ollama" && process.env.AI_ENDPOINT) {
    try {
      const llmIntent = await callOllama(message, ctx);
      if (llmIntent) return llmIntent;
    } catch (e) {
      console.warn("[AI] Ollama unavailable, falling back to rules", e);
    }
  }
  return ruleBasedInterpret(message, ctx);
}

async function callOllama(message: string, ctx: Context): Promise<AiIntent | null> {
  const endpoint = process.env.AI_ENDPOINT!.replace(/\/$/, "");
  const model = process.env.AI_MODEL || "qwen2.5:3b";

  const system = `You are HomePilot voice assistant. Convert user requests into JSON intent only.
Available rooms: ${ctx.rooms.join(", ")}
Devices: ${ctx.devices.map((d) => `${d.name} (${d.type}) in ${d.room || "unassigned"}`).join("; ")}
Respond with ONLY valid JSON matching:
{"action":"device_command"|"query_energy"|"query_status"|"unknown","targets":[{"room":"...","device":"...","type":"..."}],"parameters":{"capability":"on_off"|"fan_speed"|"brightness"|"temperature_setpoint", "payload":{}},"confidence":0.0-1.0,"needsClarification":false,"clarificationQuestion":null,"requiresConfirmation":false}
Never invent devices.`;

  const res = await fetch(`${endpoint}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: "system", content: system },
        { role: "user", content: message },
      ],
      format: "json",
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as any;
  const content = data.message?.content || data.response;
  if (!content) return null;
  const parsed = JSON.parse(content);
  return parsed as AiIntent;
}

function ruleBasedInterpret(message: string, ctx: Context): AiIntent {
  const lower = message.toLowerCase().trim();

  // Energy queries
  if (
    lower.includes("electricity") ||
    lower.includes("energy") ||
    lower.includes("power usage") ||
    lower.includes("bill") ||
    lower.includes("kwh")
  ) {
    return {
      action: "query_energy",
      confidence: 0.9,
      parameters: { reply: "Showing energy usage summary." },
    };
  }

  // Turn off / on patterns
  const onOff = lower.match(/\b(turn|switch|set)\s+(on|off)\b/) || lower.match(/\b(on|off)\b/);
  const isOff = lower.includes("off") || lower.includes("turn off") || lower.includes("switch off");
  const isOn = !isOff && (lower.includes("on") || lower.includes("turn on") || lower.includes("switch on"));

  // Fan speed
  const speedMatch = lower.match(/speed\s*(?:to\s*)?(\d)|(\d)\s*(?:speed|level)/);
  if (lower.includes("fan") && (speedMatch || isOn || isOff)) {
    const speed = speedMatch ? parseInt(speedMatch[1] || speedMatch[2], 10) : isOff ? 0 : 3;
    const room = extractRoom(lower, ctx.rooms);
    return {
      action: "device_command",
      targets: [{ room: room || undefined, type: "FAN", device: "fan" }],
      parameters: {
        capability: "fan_speed",
        payload: { value: speed },
      },
      confidence: 0.85,
    };
  }

  // AC temperature
  const tempMatch = lower.match(/(?:ac|air\s*conditioner|temperature).*?(\d{2})|(\d{2})\s*degrees?/);
  if ((lower.includes("ac") || lower.includes("air conditioner") || lower.includes("temperature")) && tempMatch) {
    const temp = parseInt(tempMatch[1] || tempMatch[2], 10);
    const room = extractRoom(lower, ctx.rooms);
    return {
      action: "device_command",
      targets: [{ room: room || undefined, type: "AC" }],
      parameters: {
        capability: "temperature_setpoint",
        payload: { value: temp },
      },
      confidence: 0.85,
    };
  }

  // Lights
  if (lower.includes("light") || lower.includes("lights") || lower.includes("lamp")) {
    const room = extractRoom(lower, ctx.rooms);
    const brightnessMatch = lower.match(/(\d{1,3})\s*%|brightness\s*(\d{1,3})/);
    if (brightnessMatch) {
      const brightness = parseInt(brightnessMatch[1] || brightnessMatch[2], 10);
      return {
        action: "device_command",
        targets: [{ room: room || undefined, type: "LIGHT" }],
        parameters: {
          capability: "brightness",
          payload: { value: brightness },
        },
        confidence: 0.85,
      };
    }
    return {
      action: "device_command",
      targets: [{ room: room || undefined, type: "LIGHT" }],
      parameters: {
        capability: "on_off",
        payload: { on: isOn || (!isOff && !lower.includes("off")) },
      },
      confidence: 0.8,
    };
  }

  // Generic on/off with device name
  if (isOn || isOff) {
    for (const d of ctx.devices) {
      if (lower.includes(d.name.toLowerCase())) {
        return {
          action: "device_command",
          targets: [{ device: d.name }],
          parameters: {
            capability: "on_off",
            payload: { on: isOn },
          },
          confidence: 0.75,
        };
      }
    }
  }

  // Water tank
  if (lower.includes("water") || lower.includes("tank") || lower.includes("pump")) {
    return {
      action: "query_status",
      parameters: { reply: "Check the Water Management screen for tank level and pump status." },
      confidence: 0.7,
    };
  }

  // Bedtime / scene
  if (lower.includes("bedtime") || lower.includes("good night") || lower.includes("night mode")) {
    return {
      action: "device_command",
      targets: ctx.devices
        .filter((d) => d.type === "LIGHT" || d.type === "FAN")
        .map((d) => ({ device: d.name })),
      parameters: {
        capability: "on_off",
        payload: { on: false },
        scene: "bedtime",
      },
      confidence: 0.7,
      requiresConfirmation: true,
    };
  }

  return {
    action: "unknown",
    confidence: 0.2,
    needsClarification: true,
    clarificationQuestion:
      "I can control lights, fans, ACs, and show energy usage. What would you like to do?",
  };
}

function extractRoom(text: string, rooms: string[]): string | null {
  for (const room of rooms) {
    if (text.includes(room.toLowerCase())) return room;
  }
  // common aliases
  if (text.includes("living")) return rooms.find((r) => r.toLowerCase().includes("living")) || null;
  if (text.includes("bed")) return rooms.find((r) => r.toLowerCase().includes("bed")) || null;
  if (text.includes("kitchen")) return rooms.find((r) => r.toLowerCase().includes("kitchen")) || null;
  return null;
}
