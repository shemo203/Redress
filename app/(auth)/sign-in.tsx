import { Link, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Linking from "expo-linking";

import {
  googleAuthRedirectUrl,
  isGoogleAuthConfigured,
  theme,
} from "../../src/constants";
import { useAuth } from "../../src/features/auth";
import { supabase } from "../../src/lib/supabaseClient";
import { BrandMark } from "../../src/ui";

export default function SignInScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const passwordInputRef = useRef<TextInput | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    router.replace("/(app)");
  }, [router, session]);

  const handleEmailSignIn = async () => {
    setStatusMessage(null);
    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setIsSubmitting(false);
    if (error) {
      setStatusMessage(error.message);
      return;
    }

    if (!data.session) {
      setStatusMessage("Sign-in succeeded, but the session was not ready. Please try again.");
      return;
    }
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <Pressable
        onPress={Keyboard.dismiss}
        style={styles.dismissArea}
      >
        <View pointerEvents="none" style={styles.heroGlow} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <BrandMark elevated size={110} />
            <Text style={styles.title}>Redress</Text>
            <Text style={styles.subtitle}>Sign in to post, rate, and explore fits.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              blurOnSubmit={false}
              keyboardType="email-address"
              onChangeText={setEmail}
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              placeholder="you@example.com"
              placeholderTextColor={theme.color.inkSoft}
              returnKeyType="next"
              style={styles.input}
              value={email}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              autoCapitalize="none"
              onChangeText={setPassword}
              onSubmitEditing={() => {
                Keyboard.dismiss();
                void handleEmailSignIn();
              }}
              placeholder="Password"
              placeholderTextColor={theme.color.inkSoft}
              ref={passwordInputRef}
              returnKeyType="done"
              secureTextEntry
              style={styles.input}
              value={password}
            />

            <Pressable
              disabled={isSubmitting}
              onPress={() => {
                Keyboard.dismiss();
                void handleEmailSignIn();
              }}
              style={[styles.button, styles.primaryButton]}
            >
              <Text style={styles.primaryButtonText}>
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Text>
            </Pressable>

            {isGoogleAuthConfigured ? (
              <Pressable
                disabled={isSubmitting}
                onPress={() => {
                  Keyboard.dismiss();
                  void handleGoogleSignIn();
                }}
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
              <Text style={styles.metaText}>Need an account? </Text>
              <Link href="/(auth)/sign-up" style={styles.linkText}>
                Sign up
              </Link>
            </View>
          </View>

          <Text style={styles.footerCopy}>Fashion-first video sharing, grading, and discovery.</Text>
        </ScrollView>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
  },
  card: {
    backgroundColor: "rgba(255, 250, 246, 0.96)",
    borderColor: theme.color.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#7f6658",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 5,
  },
  container: {
    backgroundColor: theme.color.shell,
    flex: 1,
  },
  dismissArea: {
    flex: 1,
  },
  footerCopy: {
    color: theme.color.inkSoft,
    fontSize: 12,
    marginTop: 18,
    textAlign: "center",
  },
  errorText: {
    color: theme.color.danger,
    marginTop: 10,
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  heroGlow: {
    backgroundColor: "rgba(241, 226, 215, 0.78)",
    borderRadius: 240,
    height: 280,
    left: 60,
    position: "absolute",
    top: 70,
    width: 280,
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
    marginBottom: 6,
    marginTop: 6,
  },
  metaText: {
    color: theme.color.inkSoft,
  },
  linkRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
  },
  linkText: {
    color: theme.color.accent,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: theme.color.accent,
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  secondaryButton: {
    backgroundColor: theme.color.accentSoft,
    marginTop: 10,
  },
  secondaryButtonText: {
    color: theme.color.accent,
    fontWeight: "700",
  },
  subtitle: {
    color: theme.color.inkSoft,
    fontSize: 14,
    marginTop: 6,
    textAlign: "center",
  },
  title: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 34,
    fontWeight: "700",
    marginTop: 14,
  },
});
