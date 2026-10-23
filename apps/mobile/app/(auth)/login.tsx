import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Link, router } from "expo-router";
import { useAuth } from "../../src/store/auth";
import { colors } from "../../src/theme/colors";

export default function LoginScreen() {
  const scheme = useColorScheme();
  const c = scheme === "light" ? colors.light : colors.dark;
  const { login } = useAuth();
  const [email, setEmail] = useState("demo@homepilot.app");
  const [password, setPassword] = useState("HomePilot2024!");
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)/home");
    } catch (e: any) {
      Alert.alert("Login failed", e.message || "Check credentials and API URL");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.hero}>
        <Text style={[styles.logo, { color: c.primary }]}>HomePilot</Text>
        <Text style={[styles.tagline, { color: c.textMuted }]}>
          One Home. One App. Total Control.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.label, { color: c.textMuted }]}>Email</Text>
        <TextInput
          style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface2 }]}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholderTextColor={c.textMuted}
        />
        <Text style={[styles.label, { color: c.textMuted }]}>Password</Text>
        <TextInput
          style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface2 }]}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholderTextColor={c.textMuted}
        />
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: c.primary }]}
          onPress={onSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Sign In</Text>
          )}
        </TouchableOpacity>
        <Link href="/(auth)/register" asChild>
          <TouchableOpacity style={styles.link}>
            <Text style={{ color: c.primary }}>Create account</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <Text style={[styles.hint, { color: c.textMuted }]}>
        Demo: demo@homepilot.app / HomePilot2024!
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  hero: { alignItems: "center", marginBottom: 32 },
  logo: { fontSize: 36, fontWeight: "800", letterSpacing: -0.5 },
  tagline: { fontSize: 15, marginTop: 6 },
  card: { borderRadius: 16, padding: 20, borderWidth: 1 },
  label: { fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  btn: {
    marginTop: 24,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  link: { marginTop: 16, alignItems: "center" },
  hint: { textAlign: "center", marginTop: 24, fontSize: 12 },
});
