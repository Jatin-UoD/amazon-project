import { create } from "zustand";
import { api, setToken, getToken } from "../api/client";

interface User {
  id: string;
  email: string;
  name: string;
}

interface Household {
  id: string;
  name: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  households: Household[];
  activeHouseholdId: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
  setActiveHousehold: (id: string) => void;
  refreshHouseholds: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  households: [],
  activeHouseholdId: null,
  loading: true,

  async login(email, password) {
    const data = await api<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await setToken(data.token);
    set({ user: data.user });
    await get().refreshHouseholds();
  },

  async register(email, password, name) {
    const data = await api<{ token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    await setToken(data.token);
    set({ user: data.user });
  },

  async logout() {
    await setToken(null);
    set({ user: null, households: [], activeHouseholdId: null });
  },

  async bootstrap() {
    try {
      const token = await getToken();
      if (!token) {
        set({ loading: false });
        return;
      }
      const me = await api<any>("/api/auth/me");
      set({
        user: { id: me.id, email: me.email, name: me.name },
        households: (me.memberships || []).map((m: any) => ({
          id: m.household.id,
          name: m.household.name,
          role: m.role,
        })),
        activeHouseholdId: me.memberships?.[0]?.household?.id || null,
      });
    } catch {
      await setToken(null);
      set({ user: null });
    } finally {
      set({ loading: false });
    }
  },

  setActiveHousehold(id) {
    set({ activeHouseholdId: id });
  },

  async refreshHouseholds() {
    const list = await api<Household[]>("/api/households");
    set({
      households: list,
      activeHouseholdId: get().activeHouseholdId || list[0]?.id || null,
    });
  },
}));
