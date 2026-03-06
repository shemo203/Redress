import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as Linking from "expo-linking";

import { supabase } from "../../src/lib/supabaseClient";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResetPassword = async () => {
    setStatusMessage(null);
    setIsSubmitting(true);

    const redirectTo = Linking.createURL("/(auth)/sign-in");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    setIsSubmitting(false);

    if (error) {
      setStatusMessage(error.message);
      return;
    }

    setStatusMessage("Reset link sent if the email exists.");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.copy}>
        Enter your email and we will send a reset link.
      </Text>

      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="you@example.com"
        style={styles.input}
        value={email}
      />

      <Pressable
        disabled={isSubmitting || email.trim().length === 0}
        onPress={handleResetPassword}
        style={styles.button}
      >
        <Text style={styles.buttonText}>
          {isSubmitting ? "Sending..." : "Send reset link"}
        </Text>
      </Pressable>

      {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: "#0f62fe",
    borderRadius: 10,
    marginTop: 12,
    paddingVertical: 14,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
  container: {
    flex: 1,
    gap: 10,
    padding: 20,
  },
  copy: {
    color: "#5f5f5f",
    fontSize: 15,
  },
  input: {
    backgroundColor: "#fff",
    borderColor: "#ccc",
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  statusText: {
    marginTop: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
});
