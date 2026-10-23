import { create } from "zustand";
import { api } from "../api/client";

export interface Device {
  id: string;
  name: string;
  type: string;
  roomId: string | null;
  online: boolean;
  isSimulated: boolean;
  capabilities: Array<{ capability: string; min?: number; max?: number; step?: number; options?: string[] }>;
  state: Record<string, any>;
  integration: string;
}

interface DevicesState {
  devices: Device[];
  rooms: Array<{ id: string; name: string; icon?: string }>;
  loading: boolean;
  fetchAll: (householdId: string) => Promise<void>;
  sendCommand: (
    deviceId: string,
    capability: string,
    payload: Record<string, unknown>
  ) => Promise<void>;
}

export const useDevices = create<DevicesState>((set, get) => ({
  devices: [],
  rooms: [],
  loading: false,

  async fetchAll(householdId) {
    set({ loading: true });
    try {
      const [devices, rooms] = await Promise.all([
        api<Device[]>(`/api/households/${householdId}/devices`),
        api<any[]>(`/api/households/${householdId}/rooms`),
      ]);
      set({ devices, rooms, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  async sendCommand(deviceId, capability, payload) {
    const res = await api<any>(`/api/devices/${deviceId}/command`, {
      method: "POST",
      body: JSON.stringify({ capability, payload }),
    });
    // Optimistic update from response
    if (res.device) {
      set({
        devices: get().devices.map((d) =>
          d.id === deviceId ? { ...d, state: res.device.state } : d
        ),
      });
    }
  },
}));
