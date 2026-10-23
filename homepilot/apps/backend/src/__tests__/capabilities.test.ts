import { describe, it, expect } from "vitest";

/**
 * Lightweight pure tests for capability enforcement logic.
 * Full integration tests require a running database.
 */

function hasCapability(
  capabilities: Array<{ capability: string }>,
  name: string
): boolean {
  return capabilities.some((c) => c.capability === name);
}

function applyFanSpeed(state: Record<string, unknown>, speed: number) {
  return {
    ...state,
    speed,
    on: speed > 0,
  };
}

describe("capability checks", () => {
  it("rejects fan_speed on a plain switch", () => {
    const caps = [{ capability: "on_off" }];
    expect(hasCapability(caps, "fan_speed")).toBe(false);
    expect(hasCapability(caps, "on_off")).toBe(true);
  });

  it("allows fan_speed on a fan device", () => {
    const caps = [{ capability: "on_off" }, { capability: "fan_speed" }];
    expect(hasCapability(caps, "fan_speed")).toBe(true);
  });

  it("turns fan off when speed is 0", () => {
    const next = applyFanSpeed({ on: true, speed: 3 }, 0);
    expect(next.on).toBe(false);
    expect(next.speed).toBe(0);
  });
});
