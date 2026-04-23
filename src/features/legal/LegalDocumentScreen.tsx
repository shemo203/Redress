import { Link, router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "../../constants";

type LegalSection = {
  body: string[];
  title: string;
};

type LegalDocumentScreenProps = {
  externalLinks?: Array<{
    label: string;
    url: string;
  }>;
  intro: string;
  sections: LegalSection[];
  title: string;
  updatedAt: string;
};

export function LegalDocumentScreen({
  externalLinks = [],
  intro,
  sections,
  title,
  updatedAt,
}: LegalDocumentScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom + 32, 48),
          paddingTop: Math.max(insets.top + 18, 34),
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <Link href="/(auth)/sign-up" style={styles.signUpLink}>
          Create account
        </Link>
      </View>

      <Text style={styles.eyebrow}>Redress legal</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.updated}>Last updated: {updatedAt}</Text>
      <Text style={styles.intro}>{intro}</Text>

      {sections.map((section) => (
        <View key={section.title} style={styles.card}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.body.map((paragraph) => (
            <Text key={paragraph} style={styles.body}>
              {paragraph}
            </Text>
          ))}
        </View>
      ))}

      {externalLinks.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Useful links</Text>
          {externalLinks.map((link) => (
            <Pressable
              key={link.url}
              onPress={() => void Linking.openURL(link.url)}
              style={styles.externalLinkRow}
            >
              <Text style={styles.externalLinkLabel}>{link.label}</Text>
              <Text style={styles.externalLinkUrl}>{link.url}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Text style={styles.footerNote}>
        MVP note: these pages are written for Redress internal testing and should be
        reviewed before public launch or wider distribution.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,243,0.88)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backText: {
    color: theme.color.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  body: {
    color: theme.color.ink,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 10,
  },
  card: {
    backgroundColor: "rgba(255,249,243,0.88)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 14,
    padding: 18,
  },
  container: {
    backgroundColor: theme.color.shell,
    flexGrow: 1,
    paddingHorizontal: 18,
  },
  eyebrow: {
    color: theme.color.accentBright,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 28,
    textTransform: "uppercase",
  },
  externalLinkLabel: {
    color: theme.color.accentBright,
    fontSize: 15,
    fontWeight: "700",
  },
  externalLinkRow: {
    marginTop: 12,
  },
  externalLinkUrl: {
    color: theme.color.inkSoft,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  footerNote: {
    color: theme.color.inkSoft,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 18,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  intro: {
    color: theme.color.inkSoft,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14,
  },
  sectionTitle: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 22,
    fontWeight: "700",
  },
  signUpLink: {
    color: theme.color.accentBright,
    fontSize: 13,
    fontWeight: "700",
  },
  title: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 36,
    fontWeight: "700",
    lineHeight: 42,
    marginTop: 8,
  },
  updated: {
    color: theme.color.inkSoft,
    fontSize: 13,
    marginTop: 8,
  },
});
