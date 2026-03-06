import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useAuth } from "../../src/features/auth";

export default function AppHomeScreen() {
  const { profile, user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Authenticated</Text>
      <Text style={styles.copy}>You are signed in.</Text>
      <Text style={styles.copy}>User ID: {user?.id ?? "-"}</Text>
      <Text style={styles.copy}>Username: {profile?.username ?? "-"}</Text>
      <Link href="/(app)/account" style={styles.link}>
        Go to Account
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 8,
    justifyContent: "center",
    padding: 24,
  },
  copy: {
    color: "#3d3d3d",
    fontSize: 16,
  },
  link: {
    color: "#0f62fe",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
  },
});
