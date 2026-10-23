import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  ScrollView,
  RefreshControl,
  Dimensions,
} from "react-native";
import { useAuth } from "../../src/store/auth";
import { api } from "../../src/api/client";
import { colors } from "../../src/theme/colors";

export default function EnergyScreen() {
  const scheme = useColorScheme();
  const c = scheme === "light" ? colors.light : colors.dark;
  const { activeHouseholdId } = useAuth();
  const [live, setLive] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!activeHouseholdId) return;
    try {
      const [l, s, h] = await Promise.all([
        api(`/api/households/${activeHouseholdId}/energy/live`),
        api(`/api/households/${activeHouseholdId}/energy/summary`),
        api(`/api/households/${activeHouseholdId}/energy/history?interval=hour`),
      ]);
      setLive(l);
      setSummary(s);
      setHistory(h.series || []);
    } catch {
      /* keep previous chart */
    }
  }, [activeHouseholdId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const maxPower = Math.max(...history.map((p) => p.avgPowerW || 0), 1);
  const chartWidth = Dimensions.get("window").width - 48;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={[styles.title, { color: c.text }]}>Energy Analytics</Text>
      {live?.live?.source === "simulated" && (
        <Text style={{ color: c.warning, marginBottom: 8, fontSize: 12 }}>
          Showing simulated meter data
        </Text>
      )}

      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={{ color: c.textMuted }}>Live Power</Text>
        <Text style={[styles.big, { color: c.text }]}>
          {live?.live?.powerW != null ? `${Math.round(live.live.powerW)} W` : "—"}
        </Text>
        <View style={styles.metrics}>
          <Metric label="Voltage" value={live?.live?.voltageV ? `${live.live.voltageV} V` : "—"} c={c} />
          <Metric label="Current" value={live?.live?.currentA ? `${live.live.currentA} A` : "—"} c={c} />
          <Metric label="PF" value={live?.live?.powerFactor?.toFixed(2) || "—"} c={c} />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.cardTitle, { color: c.text }]}>Today</Text>
        <View style={styles.metrics}>
          <Metric label="Energy" value={`${summary?.todayKwh ?? "—"} kWh`} c={c} />
          <Metric label="Est. cost" value={`₹${summary?.estimatedTodayCostInr ?? "—"}`} c={c} />
          <Metric label="Peak" value={`${summary?.peakPowerW ?? "—"} W`} c={c} />
        </View>
        <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 8 }}>
          Tariff: ₹{summary?.tariffInrPerKwh}/kWh · {summary?.sourceNote}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.cardTitle, { color: c.text }]}>Power trend (24h)</Text>
        {history.length === 0 ? (
          <Text style={{ color: c.textMuted }}>No data yet. Start the simulator.</Text>
        ) : (
          <View style={styles.chart}>
            {history.map((p, i) => (
              <View
                key={i}
                style={{
                  width: Math.max(2, chartWidth / history.length - 1),
                  height: Math.max(2, ((p.avgPowerW || 0) / maxPower) * 100),
                  backgroundColor: c.primary,
                  borderRadius: 2,
                  marginHorizontal: 0.5,
                }}
              />
            ))}
          </View>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.cardTitle, { color: c.text }]}>This month</Text>
        <Text style={{ color: c.text, fontSize: 22, fontWeight: "700" }}>
          {summary?.monthKwh ?? "—"} kWh · ₹{summary?.estimatedMonthCostInr ?? "—"}
        </Text>
      </View>
    </ScrollView>
  );
}

function Metric({ label, value, c }: any) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: c.textMuted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: c.text, fontWeight: "600" }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800", marginBottom: 12 },
  card: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 14 },
  cardTitle: { fontWeight: "700", marginBottom: 10 },
  big: { fontSize: 36, fontWeight: "800", marginVertical: 4 },
  metrics: { flexDirection: "row", marginTop: 8, gap: 8 },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 110,
    marginTop: 8,
  },
});
