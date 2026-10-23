import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme, View, ActivityIndicator } from "react-native";
import { useAuth } from "../src/store/auth";
import { colors } from "../src/theme/colors";

export default function RootLayout() {
  const scheme = useColorScheme();
  const c = scheme === "light" ? colors.light : colors.dark;
  const { bootstrap, loading, user } = useAuth();

  useEffect(() => {
    bootstrap();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={c.primary} />
        <StatusBar style={scheme === "light" ? "dark" : "light"} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={scheme === "light" ? "dark" : "light"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.bg },
          headerTintColor: c.text,
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="device/[id]" options={{ title: "Device" }} />
        <Stack.Screen name="ai" options={{ title: "AI Assistant", presentation: "modal" }} />
      </Stack>
    </>
  );
}
