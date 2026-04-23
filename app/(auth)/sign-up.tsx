import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { PRIVACY_URL, TERMS_URL, theme } from "../../src/constants";
import { supabase } from "../../src/lib/supabaseClient";

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAgeConfirmed, setIsAgeConfirmed] = useState(false);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    email.trim().length > 0 &&
    password.length >= 6 &&
    isAgeConfirmed &&
    isTermsAccepted;

  const handleSignUp = async () => {
    setStatusMessage(null);
    if (!canSubmit) {
      setStatusMessage(
        "Complete all fields, confirm 13+, and accept Terms & Privacy."
      );
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setIsSubmitting(false);

    if (error) {
      setStatusMessage(error.message);
      return;
    }

    setStatusMessage("Sign-up complete. Check email if confirmation is enabled.");
    router.replace("/(auth)");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create account</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="you@example.com"
        style={styles.input}
        value={email}
      />

      <Text style={styles.label}>Password (min 6 chars)</Text>
      <TextInput
        autoCapitalize="none"
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        value={password}
      />

      <Pressable
        onPress={() => setIsAgeConfirmed((current) => !current)}
        style={styles.checkboxRow}
      >
        <Text style={styles.checkbox}>{isAgeConfirmed ? "[x]" : "[ ]"}</Text>
        <Text>I am 13 or older</Text>
      </Pressable>

      <Pressable
        onPress={() => setIsTermsAccepted((current) => !current)}
        style={styles.checkboxRow}
      >
        <Text style={styles.checkbox}>{isTermsAccepted ? "[x]" : "[ ]"}</Text>
        <Text>I accept Terms & Privacy</Text>
      </Pressable>

      <View style={styles.linkRow}>
        <Text>Terms: </Text>
        <Link href={TERMS_URL} style={styles.linkText}>
          Terms of Use
        </Link>
      </View>
      <View style={styles.linkRow}>
        <Text>Privacy: </Text>
        <Link href={PRIVACY_URL} style={styles.linkText}>
          Privacy Notice
        </Link>
      </View>

      <Pressable
        disabled={isSubmitting || !canSubmit}
        onPress={handleSignUp}
        style={[
          styles.button,
          canSubmit ? styles.primaryButton : styles.disabledButton,
        ]}
      >
        <Text style={styles.primaryButtonText}>
          {isSubmitting ? "Creating..." : "Sign up"}
        </Text>
      </Pressable>

      {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}

      <View style={styles.linkRow}>
        <Text>Already have an account? </Text>
        <Link href="/(auth)" style={styles.linkText}>
          Sign in
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 10,
    marginTop: 10,
    paddingVertical: 14,
  },
  checkbox: {
    color: theme.color.accent,
    fontWeight: "700",
    width: 30,
  },
  checkboxRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 6,
  },
  container: {
    backgroundColor: theme.color.bg,
    flex: 1,
    gap: 10,
    padding: 20,
  },
  disabledButton: {
    backgroundColor: "#cc9b95",
  },
  input: {
    backgroundColor: theme.color.bgPanel,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.color.ink,
    padding: 12,
  },
  label: {
    color: theme.color.ink,
    fontWeight: "600",
    marginTop: 4,
  },
  linkRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 4,
  },
  linkText: {
    color: theme.color.accent,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: theme.color.accent,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  statusText: {
    color: theme.color.ink,
    marginTop: 6,
  },
  title: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 34,
    fontWeight: "700",
    marginBottom: 8,
  },
});
