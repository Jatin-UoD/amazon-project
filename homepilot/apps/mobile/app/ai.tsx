import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../src/store/auth";
import { api } from "../src/api/client";
import { colors } from "../src/theme/colors";

interface Msg {
  role: "user" | "assistant";
  text: string;
}

export default function AiScreen() {
  const scheme = useColorScheme();
  const c = scheme === "light" ? colors.light : colors.dark;
  const { activeHouseholdId } = useAuth();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Hi! Try: \"Turn off the living room lights\", \"Set fan speed to 3\", or \"Show electricity usage\". AI is optional — rules work without a model.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim() || !activeHouseholdId) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setLoading(true);
    try {
      const res = await api<any>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: userMsg, householdId: activeHouseholdId }),
      });
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: res.message || JSON.stringify(res, null, 2),
        },
      ]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", text: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        {messages.map((m, i) => (
          <View
            key={i}
            style={[
              styles.bubble,
              {
                backgroundColor: m.role === "user" ? c.primary : c.surface,
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                borderColor: c.border,
              },
            ]}
          >
            <Text style={{ color: m.role === "user" ? "#fff" : c.text }}>{m.text}</Text>
          </View>
        ))}
        {loading && <ActivityIndicator color={c.primary} style={{ marginVertical: 8 }} />}
      </ScrollView>
      <View style={[styles.inputRow, { borderTopColor: c.border, backgroundColor: c.surface }]}>
        <TextInput
          style={[styles.input, { color: c.text, backgroundColor: c.surface2 }]}
          placeholder="Ask HomePilot…"
          placeholderTextColor={c.textMuted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <TouchableOpacity style={[styles.send, { backgroundColor: c.primary }]} onPress={send}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: "85%",
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  inputRow: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    gap: 8,
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  send: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
});
