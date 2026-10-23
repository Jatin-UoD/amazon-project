import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "../../src/api/client";
import { useDevices } from "../../src/store/devices";
import { colors } from "../../src/theme/colors";

export default function DeviceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme();
  const c = scheme === "light" ? colors.light : colors.dark;
  const { devices, sendCommand, fetchAll } = useDevices();
  const [device, setDevice] = useState<any>(null);

  useEffect(() => {
    const d = devices.find((x) => x.id === id);
    if (d) setDevice(d);
    else {
      api(`/api/devices/${id}`)
        .then(setDevice)
        .catch((e) => Alert.alert("Error", e.message));
    }
  }, [id, devices]);

  if (!device) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.textMuted }}>Loading…</Text>
      </View>
    );
  }

  const caps = device.capabilities || [];

  async function cmd(capability: string, payload: Record<string, unknown>) {
    try {
      await sendCommand(device.id, capability, payload);
      const updated = await api(`/api/devices/${device.id}`);
      setDevice(updated);
    } catch (e: any) {
      Alert.alert("Command failed", e.message);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 16 }}>
      <Text style={[styles.name, { color: c.text }]}>{device.name}</Text>
      <Text style={{ color: c.textMuted, marginBottom: 16 }}>
        {device.type}
        {device.isSimulated ? " · Simulated" : ""}
        {device.online ? " · Online" : " · Offline"}
      </Text>

      {caps.some((x: any) => x.capability === "on_off") && (
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={{ color: c.text, fontWeight: "600" }}>Power</Text>
          <Switch
            value={Boolean(device.state.on)}
            onValueChange={(on) => cmd("on_off", { on })}
          />
        </View>
      )}

      {caps.some((x: any) => x.capability === "brightness") && (
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={{ color: c.text, fontWeight: "600", marginBottom: 8 }}>
            Brightness: {device.state.brightness ?? 0}%
          </Text>
          <View style={styles.row}>
            {[0, 25, 50, 75, 100].map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.chip, { borderColor: c.border, backgroundColor: device.state.brightness === v ? c.primary : c.surface2 }]}
                onPress={() => cmd("brightness", { value: v })}
              >
                <Text style={{ color: device.state.brightness === v ? "#fff" : c.text }}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {caps.some((x: any) => x.capability === "fan_speed") && (
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={{ color: c.text, fontWeight: "600", marginBottom: 8 }}>
            Fan speed: {device.state.speed ?? 0}
          </Text>
          <View style={styles.row}>
            {[0, 1, 2, 3, 4, 5].map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.chip, { borderColor: c.border, backgroundColor: device.state.speed === v ? c.primary : c.surface2 }]}
                onPress={() => cmd("fan_speed", { value: v })}
              >
                <Text style={{ color: device.state.speed === v ? "#fff" : c.text }}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {caps.some((x: any) => x.capability === "temperature_setpoint") && (
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={{ color: c.text, fontWeight: "600", marginBottom: 8 }}>
            Temperature: {device.state.temperature ?? 24}°C
          </Text>
          <View style={styles.row}>
            {[18, 20, 22, 24, 26, 28].map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.chip, { borderColor: c.border, backgroundColor: device.state.temperature === v ? c.primary : c.surface2 }]}
                onPress={() => cmd("temperature_setpoint", { value: v })}
              >
                <Text style={{ color: device.state.temperature === v ? "#fff" : c.text }}>{v}°</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {caps.some((x: any) => x.capability === "ac_mode") && (
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={{ color: c.text, fontWeight: "600", marginBottom: 8 }}>Mode</Text>
          <View style={styles.row}>
            {["cool", "heat", "fan", "dry", "auto"].map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.chip, { borderColor: c.border, backgroundColor: device.state.mode === v ? c.primary : c.surface2 }]}
                onPress={() => cmd("ac_mode", { value: v })}
              >
                <Text style={{ color: device.state.mode === v ? "#fff" : c.text, textTransform: "capitalize" }}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {caps.some((x: any) => x.capability === "position") && (
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={{ color: c.text, fontWeight: "600", marginBottom: 8 }}>
            Position: {device.state.position ?? 0}%
          </Text>
          <View style={styles.row}>
            {[0, 25, 50, 75, 100].map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.chip, { borderColor: c.border, backgroundColor: device.state.position === v ? c.primary : c.surface2 }]}
                onPress={() => cmd("position", { value: v })}
              >
                <Text style={{ color: device.state.position === v ? "#fff" : c.text }}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {device.type === "SENSOR_WATER_LEVEL" && (
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={{ color: c.textMuted }}>Tank level</Text>
          <Text style={{ color: c.text, fontSize: 32, fontWeight: "800" }}>
            {device.state.levelPercent ?? "—"}%
          </Text>
        </View>
      )}

      {!caps.length && (
        <Text style={{ color: c.textMuted }}>
          No controllable capabilities. Integration may be required for this appliance type.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  name: { fontSize: 26, fontWeight: "800" },
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, width: "100%", marginTop: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
});
