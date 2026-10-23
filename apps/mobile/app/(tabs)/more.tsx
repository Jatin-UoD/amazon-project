import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../src/store/auth";
import { colors } from "../../src/theme/colors";
import { API_URL } from "../../src/api/client";

export default function MoreScreen() {
  const scheme = useColorScheme();
  const c = scheme === "light" ? colors.light : colors.dark;
  const { user, logout, households, activeHouseholdId } = useAuth();

  const items = [
    { title: "Automations", route: null, note: "Manage rules in backend / future screen" },
    { title: "Water Management", route: null, note: "Tank & pump on Rooms → Utility" },
    { title: "Notifications", route: null },
    { title: "Members & Roles", route: null },
    { title: "Device Pairing", route: null },
    { title: "AI Assistant", route: "/ai" },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 16 }}>
      <Text style={[styles.title, { color: c.text }]}>Settings</Text>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={{ color: c.text, fontWeight: "600" }}>{user?.name}</Text>
        <Text style={{ color: c.textMuted }}>{user?.email}</Text>
        <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 4 }}>
          API: {API_URL}
        </Text>
      </View>

      {items.map((item) => (
        <TouchableOpacity
          key={item.title}
          style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={() => {
            if (item.route) router.push(item.route as any);
            else Alert.alert(item.title, item.note || "Available via API / next iteration");
          }}
        >
          <Text style={{ color: c.text, fontWeight: "500" }}>{item.title}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[styles.logout, { borderColor: c.danger }]}
        onPress={async () => {
          await logout();
          router.replace("/(auth)/login");
        }}
      >
        <Text style={{ color: c.danger, fontWeight: "700" }}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800", marginBottom: 12 },
  card: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 16 },
  row: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  logout: {
    marginTop: 24,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
});
