import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { useAuth } from "../../src/store/auth";
import { api } from "../../src/api/client";
import { colors } from "../../src/theme/colors";

export default function SecurityScreen() {
  const scheme = useColorScheme();
  const c = scheme === "light" ? colors.light : colors.dark;
  const { activeHouseholdId } = useAuth();
  const [status, setStatus] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!activeHouseholdId) return;
    try {
      const [s, e] = await Promise.all([
        api("/api/ring/status"),
        api(`/api/ring/households/${activeHouseholdId}/events`),
      ]);
      setStatus(s);
      setEvents(e);
    } catch {
      /* status stays empty until the API answers */
    }
  }, [activeHouseholdId]);

  useEffect(() => {
    load();
  }, [load]);

  async function injectDemo() {
    if (!activeHouseholdId) return;
    try {
      await api("/api/ring/demo/inject", {
        method: "POST",
        body: JSON.stringify({
          householdId: activeHouseholdId,
          eventType: "motion",
        }),
      });
      Alert.alert("Demo event", "Simulated Ring motion event injected.");
      await load();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
    >
      <Text style={[styles.title, { color: c.text }]}>Ring Security</Text>

      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.cardTitle, { color: c.text }]}>Integration status</Text>
        <Text style={{ color: c.textMuted }}>
          {status?.configured
            ? "OAuth credentials configured"
            : "No Ring credentials — using demo simulator"}
        </Text>
        <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 6 }}>{status?.note}</Text>
      </View>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: c.ring }]}
        onPress={injectDemo}
      >
        <Text style={styles.btnText}>Inject Demo Motion Event</Text>
      </TouchableOpacity>

      <Text style={[styles.section, { color: c.text }]}>Recent events</Text>
      {events.length === 0 && (
        <Text style={{ color: c.textMuted }}>No events yet.</Text>
      )}
      {events.map((ev) => (
        <View
          key={ev.id}
          style={[styles.event, { backgroundColor: c.surface, borderColor: c.border }]}
        >
          <Text style={{ color: c.text, fontWeight: "600" }}>{ev.eventType}</Text>
          <Text style={{ color: c.textMuted, fontSize: 12 }}>
            {new Date(ev.receivedAt).toLocaleString()}
            {ev.payload?.simulated ? " · SIMULATED" : ""}
          </Text>
        </View>
      ))}

      <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 20 }}>
        Ring cameras are for security events only. Appliance control uses the home controller
        integration. See docs/RING_INTEGRATION.md.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800", marginBottom: 12 },
  card: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 14 },
  cardTitle: { fontWeight: "700", marginBottom: 6 },
  btn: { borderRadius: 12, padding: 14, alignItems: "center", marginBottom: 20 },
  btnText: { color: "#fff", fontWeight: "700" },
  section: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  event: { borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 8 },
});
