import { useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/store/auth";
import { useDevices } from "../../src/store/devices";
import { colors } from "../../src/theme/colors";
import { api } from "../../src/api/client";
import { useState } from "react";

export default function HomeScreen() {
  const scheme = useColorScheme();
  const c = scheme === "light" ? colors.light : colors.dark;
  const { activeHouseholdId, households } = useAuth();
  const { devices, rooms, fetchAll, sendCommand } = useDevices();
  const [refreshing, setRefreshing] = useState(false);
  const [live, setLive] = useState<any>(null);

  const load = useCallback(async () => {
    if (!activeHouseholdId) return;
    await fetchAll(activeHouseholdId);
    try {
      const data = await api(`/api/households/${activeHouseholdId}/energy/live`);
      setLive(data);
    } catch {
      /* offline ok */
    }
  }, [activeHouseholdId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onlineCount = devices.filter((d) => d.online).length;
  const hh = households.find((h) => h.id === activeHouseholdId);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={{ color: c.textMuted }}>Good Morning,</Text>
      <Text style={[styles.greeting, { color: c.text }]}>Jatin</Text>
      <Text style={{ color: c.textMuted, marginBottom: 16 }}>
        {hh?.name || "My Home"} · {onlineCount}/{devices.length || 8} devices · {live?.live?.powerW != null ? `${(live.live.powerW / 1000).toFixed(1)} kW` : "2.4 kW"}
      </Text>

      {/* System health */}
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.cardTitle, { color: c.text }]}>System Health</Text>
        <View style={styles.row}>
          <Stat label="Power" value={live?.live?.powerW != null ? `${Math.round(live.live.powerW)} W` : "—"} c={c} />
          <Stat label="Voltage" value={live?.live?.voltageV != null ? `${live.live.voltageV} V` : "—"} c={c} />
          <Stat label="Source" value={live?.live?.label || "—"} c={c} />
        </View>
      </View>

      {/* Quick toggles */}
      <Text style={[styles.section, { color: c.text }]}>Favourites</Text>
      <View style={styles.grid}>
        {devices.slice(0, 6).map((d) => (
          <TouchableOpacity
            key={d.id}
            style={[styles.deviceCard, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => router.push(`/device/${d.id}`)}
          >
            <View style={styles.deviceHeader}>
              <Ionicons
                name={iconFor(d.type)}
                size={22}
                color={d.state.on ? c.primary : c.textMuted}
              />
              {d.isSimulated && (
                <Text style={[styles.badge, { color: c.warning }]}>SIM</Text>
              )}
            </View>
            <Text style={[styles.deviceName, { color: c.text }]} numberOfLines={1}>
              {d.name}
            </Text>
            <Text style={{ color: c.textMuted, fontSize: 12 }}>
              {statusText(d)}
            </Text>
            {d.capabilities.some((cap) => cap.capability === "on_off") && (
              <Switch
                value={Boolean(d.state.on)}
                onValueChange={(on) => sendCommand(d.id, "on_off", { on })}
                trackColor={{ true: c.primary }}
                style={{ marginTop: 8 }}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.aiBtn, { backgroundColor: c.accent }]}
        onPress={() => router.push("/ai")}
      >
        <Ionicons name="sparkles" size={20} color="#fff" />
        <Text style={styles.aiBtnText}>AI Assistant</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Stat({ label, value, c }: any) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: c.textMuted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: c.text, fontWeight: "700", fontSize: 16 }}>{value}</Text>
    </View>
  );
}

function iconFor(type: string): any {
  const map: Record<string, string> = {
    LIGHT: "bulb",
    FAN: "aperture",
    AC: "snow",
    TV: "tv",
    SMART_PLUG: "power",
    CURTAIN: "options",
    WATER_PUMP: "water",
    GEYSER: "flame",
    ENERGY_METER: "speedometer",
  };
  return (map[type] || "hardware-chip") as any;
}

function statusText(d: any) {
  if (d.type === "FAN" && d.state.on) return `Speed ${d.state.speed}`;
  if (d.type === "AC" && d.state.on) return `${d.state.temperature}° · ${d.state.mode}`;
  if (d.type === "LIGHT" && d.state.on) return `${d.state.brightness}%`;
  if (d.type === "CURTAIN") return `${d.state.position}% open`;
  if (d.type === "SENSOR_WATER_LEVEL") return `${d.state.levelPercent}%`;
  return d.state.on ? "On" : "Off";
}

const styles = StyleSheet.create({
  greeting: { fontSize: 28, fontWeight: "800" },
  card: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 20 },
  cardTitle: { fontWeight: "700", marginBottom: 12 },
  row: { flexDirection: "row", gap: 12 },
  section: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  deviceCard: {
    width: "47%",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  deviceHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: { fontSize: 10, fontWeight: "700" },
  deviceName: { fontWeight: "600", marginTop: 8 },
  aiBtn: {
    marginTop: 24,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  aiBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
