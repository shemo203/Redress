import { Link, Redirect } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { DEV_SEED_ENABLED, theme } from "../../src/constants";

const STEPS = [
  "Open Supabase Dashboard for your dev project.",
  "Go to SQL Editor and create a new query.",
  "Open supabase/seed.sql from this repo and paste the full file into SQL Editor.",
  "Run the script. It will upsert seeded profiles for existing auth users and recreate the seeded posts + tags.",
  "Reload the app and check the feed, reveal items sheet, grading, outbound clicks, and reporting flows.",
];

export default function DevSeedScreen() {
  if (!DEV_SEED_ENABLED) {
    return <Redirect href="/(app)/account" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Developer tools</Text>
        <Text style={styles.title}>Seed database</Text>
        <Text style={styles.copy}>
          This workflow seeds deterministic demo posts and tags without touching
          `auth.users`. It uses the first 10 existing auth users in your dev
          project, so create those accounts first if you want the full dataset.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>What gets seeded</Text>
        <Text style={styles.cardCopy}>Up to 10 profiles, 20 published posts, and 50 clothing tags.</Text>
        <Text style={styles.cardCopy}>Seed file: `supabase/seed.sql`</Text>
        <Text style={styles.cardCopy}>Runbook: `docs/50_RUNBOOK.md`</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Run it</Text>
        {STEPS.map((step, index) => (
          <Text key={step} style={styles.step}>
            {index + 1}. {step}
          </Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Runbook links</Text>
        <Text style={styles.cardCopy}>
          Source of truth: `docs/50_RUNBOOK.md`
        </Text>
        <Text style={styles.cardCopy}>
          Seed SQL file: `supabase/seed.sql`
        </Text>
        <Link href="/(app)/account" style={styles.inlineLink}>
          Back to Account
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,249,243,0.94)",
    borderColor: theme.color.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    marginTop: 16,
    padding: 18,
  },
  cardCopy: {
    color: theme.color.inkSoft,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  cardTitle: {
    color: theme.color.ink,
    fontSize: 18,
    fontWeight: "700",
  },
  container: {
    backgroundColor: theme.color.shell,
    flexGrow: 1,
    padding: 18,
  },
  copy: {
    color: theme.color.inkSoft,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  eyebrow: {
    color: theme.color.accentBright,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  hero: {
    backgroundColor: "#ece3d8",
    borderRadius: 28,
    padding: 22,
  },
  inlineLink: {
    color: theme.color.accentBright,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 14,
  },
  step: {
    color: theme.color.ink,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  title: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 32,
    fontWeight: "700",
    marginTop: 4,
  },
});
