import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../src/store/auth";
import { colors } from "../../src/theme/colors";
import { api } from "../../src/api/client";

export default function RegisterScreen() {
  const scheme = useColorScheme();
  const c = scheme === "light" ? colors.light : colors.dark;
  const { register, refreshHouseholds } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
      // Create default household
      await api("/api/households", {
        method: "POST",
        body: JSON.stringify({ name: `${name.trim()}'s Home` }),
      });
      await refreshHouseholds();
      router.replace("/(tabs)/home");
    } catch (e: any) {
      Alert.alert("Registration failed", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <Text style={[styles.title, { color: c.text }]}>Create account</Text>
      <TextInput
        style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
        placeholder="Name"
        placeholderTextColor={c.textMuted}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
        placeholder="Email"
        placeholderTextColor={c.textMuted}
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
        placeholder="Password (min 8)"
        placeholderTextColor={c.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: c.primary }]}
        onPress={onSubmit}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Register</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={{ color: c.primary, textAlign: "center", marginTop: 16 }}>Back to login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  btn: { borderRadius: 12, padding: 14, alignItems: "center", marginTop: 8 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
