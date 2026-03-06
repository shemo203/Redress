import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as Linking from "expo-linking";

import {
  googleAuthRedirectUrl,
  isGoogleAuthConfigured,
} from "../../src/constants";
import { supabase } from "../../src/lib/supabaseClient";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailSignIn = async () => {
    setStatusMessage(null);
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setIsSubmitting(false);
    if (error) {
      setStatusMessage(error.message);
      return;
    }

    router.replace("/(app)");
  };

  const handleGoogleSignIn = async () => {
    setStatusMessage(null);
    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signInWithOAuth({
      options: googleAuthRedirectUrl
        ? { redirectTo: googleAuthRedirectUrl }
        : undefined,
      provider: "google",
    });

    setIsSubmitting(false);
    if (error) {
      setStatusMessage(error.message);
      return;
    }

    if (data.url) {
      await Linking.openURL(data.url);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome back</Text>

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

      <Text style={styles.label}>Password</Text>
      <TextInput
        autoCapitalize="none"
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        value={password}
      />

      <Pressable
        disabled={isSubmitting}
        onPress={handleEmailSignIn}
        style={[styles.button, styles.primaryButton]}
      >
        <Text style={styles.primaryButtonText}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Text>
      </Pressable>

      {isGoogleAuthConfigured ? (
        <Pressable
          disabled={isSubmitting}
          onPress={handleGoogleSignIn}
          style={[styles.button, styles.secondaryButton]}
        >
          <Text style={styles.secondaryButtonText}>Continue with Google</Text>
        </Pressable>
      ) : null}

      {statusMessage ? <Text style={styles.errorText}>{statusMessage}</Text> : null}

      <View style={styles.linkRow}>
        <Link href="/(auth)/forgot-password" style={styles.linkText}>
          Forgot password?
        </Link>
      </View>
      <View style={styles.linkRow}>
        <Text>Need an account? </Text>
        <Link href="/(auth)/sign-up" style={styles.linkText}>
          Sign up
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 10,
    paddingVertical: 14,
  },
  container: {
    flex: 1,
    gap: 10,
    padding: 20,
  },
  errorText: {
    color: "#b00020",
    marginTop: 4,
  },
  input: {
    backgroundColor: "#fff",
    borderColor: "#ccc",
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  label: {
    fontWeight: "600",
    marginTop: 4,
  },
  linkRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  linkText: {
    color: "#0f62fe",
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#0f62fe",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#eef4ff",
  },
  secondaryButtonText: {
    color: "#0f62fe",
    fontWeight: "700",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
});
