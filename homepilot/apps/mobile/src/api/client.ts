import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  "http://localhost:3000";

let tokenCache: string | null = null;

export async function getToken(): Promise<string | null> {
  if (tokenCache) return tokenCache;
  try {
    tokenCache = await SecureStore.getItemAsync("hp_token");
  } catch {
    tokenCache = null;
  }
  return tokenCache;
}

export async function setToken(token: string | null) {
  tokenCache = token;
  if (token) {
    await SecureStore.setItemAsync("hp_token", token);
  } else {
    await SecureStore.deleteItemAsync("hp_token");
  }
}

export async function api<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export { API_URL };
