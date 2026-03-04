import { StyleSheet, Text, View } from "react-native";

import { isSupabaseConfigured } from "../src/lib/supabaseClient";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello / Logged out</Text>
      <Text style={styles.copy}>
        Supabase configured: {isSupabaseConfigured ? "yes" : "no"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#f7f4ee",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: "#1e1b18",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
  },
  copy: {
    color: "#4f4a45",
    fontSize: 18,
  },
});
