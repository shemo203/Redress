import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { theme } from "../../src/constants";
import { useAuth } from "../../src/features/auth";
import { supabase } from "../../src/lib/supabaseClient";

export default function AccountScreen() {
  const { profile, user } = useAuth();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignOut = async () => {
    setStatusMessage(null);
    setIsSubmitting(true);
    const { error } = await supabase.auth.signOut();
    setIsSubmitting(false);

    if (error) {
      setStatusMessage(error.message);
      return;
    }

    setStatusMessage("Signed out.");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Account</Text>

      <View style={styles.card}>
        <Text style={styles.label}>User ID</Text>
        <Text style={styles.value}>{user?.id ?? "-"}</Text>

        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email ?? "-"}</Text>

        <Text style={styles.label}>Username</Text>
        <Text style={styles.value}>{profile?.username ?? "-"}</Text>
      </View>

      <Pressable
        disabled={isSubmitting}
        onPress={handleSignOut}
        style={styles.button}
      >
        <Text style={styles.buttonText}>
          {isSubmitting ? "Signing out..." : "Sign out"}
        </Text>
      </Pressable>

      {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.pill,
    marginTop: 18,
    paddingVertical: 13,
  },
  buttonText: {
    color: theme.color.white,
    fontWeight: "700",
  },
  card: {
    backgroundColor: theme.color.bgPanel,
    borderColor: theme.color.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  container: {
    backgroundColor: theme.color.bg,
    flexGrow: 1,
    padding: theme.spacing.lg,
  },
  heading: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 34,
    fontWeight: "700",
    marginBottom: 16,
  },
  label: {
    color: theme.color.muted,
    fontSize: 13,
    marginTop: 8,
  },
  status: {
    color: theme.color.ink,
    marginTop: 10,
  },
  value: {
    color: theme.color.ink,
    fontSize: 16,
    fontWeight: "600",
  },
});
