import { useEffect } from "react";
import { Redirect } from "expo-router";
import { useAuth } from "../src/store/auth";

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(tabs)/home" />;
}
