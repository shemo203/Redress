import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
    <View style={styles.container}>
      <Text style={styles.heading}>Account</Text>

      <Text style={styles.label}>User ID</Text>
      <Text style={styles.value}>{user?.id ?? "-"}</Text>

      <Text style={styles.label}>Email</Text>
      <Text style={styles.value}>{user?.email ?? "-"}</Text>

      <Text style={styles.label}>Username</Text>
      <Text style={styles.value}>{profile?.username ?? "-"}</Text>

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
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: "#1f1f1f",
    borderRadius: 10,
    marginTop: 18,
    paddingVertical: 12,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
  container: {
    flex: 1,
    padding: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 16,
  },
  label: {
    color: "#555",
    fontSize: 13,
    marginTop: 8,
  },
  status: {
    marginTop: 10,
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
  },
});
