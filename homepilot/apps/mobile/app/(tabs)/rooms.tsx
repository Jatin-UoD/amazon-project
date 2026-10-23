import { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  ScrollView,
  TouchableOpacity,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../src/store/auth";
import { useDevices } from "../../src/store/devices";
import { colors } from "../../src/theme/colors";

export default function RoomsScreen() {
  const scheme = useColorScheme();
  const c = scheme === "light" ? colors.light : colors.dark;
  const { activeHouseholdId } = useAuth();
  const { devices, rooms, fetchAll, sendCommand } = useDevices();

  useEffect(() => {
    if (activeHouseholdId) fetchAll(activeHouseholdId);
  }, [activeHouseholdId]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 16 }}>
      {rooms.map((room) => {
        const roomDevices = devices.filter((d) => d.roomId === room.id);
        return (
          <View key={room.id} style={{ marginBottom: 24 }}>
            <Text style={[styles.roomName, { color: c.text }]}>{room.name}</Text>
            {roomDevices.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}
                onPress={() => router.push(`/device/${d.id}`)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontWeight: "600" }}>{d.name}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 12 }}>
                    {d.type}
                    {d.isSimulated ? " · Simulated" : ""}
                    {!d.online ? " · Offline" : ""}
                  </Text>
                </View>
                {d.capabilities.some((cap) => cap.capability === "on_off") && (
                  <Switch
                    value={Boolean(d.state.on)}
                    onValueChange={(on) => sendCommand(d.id, "on_off", { on })}
                  />
                )}
              </TouchableOpacity>
            ))}
            {roomDevices.length === 0 && (
              <Text style={{ color: c.textMuted }}>No devices in this room</Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  roomName: { fontSize: 20, fontWeight: "700", marginBottom: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
});
