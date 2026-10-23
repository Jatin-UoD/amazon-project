export const colors = {
  dark: {
    bg: "#0B1220",
    surface: "#141C2E",
    surface2: "#1C2740",
    border: "#2A3654",
    text: "#F1F5F9",
    textMuted: "#94A3B8",
    primary: "#3B82F6",
    primaryMuted: "#1E3A5F",
    success: "#22C55E",
    warning: "#F59E0B",
    danger: "#EF4444",
    accent: "#8B5CF6",
    ring: "#E11D48",
  },
  light: {
    bg: "#F8FAFC",
    surface: "#FFFFFF",
    surface2: "#F1F5F9",
    border: "#E2E8F0",
    text: "#0F172A",
    textMuted: "#64748B",
    primary: "#2563EB",
    primaryMuted: "#DBEAFE",
    success: "#16A34A",
    warning: "#D97706",
    danger: "#DC2626",
    accent: "#7C3AED",
    ring: "#E11D48",
  },
};

export type ThemeColors = typeof colors.dark;
