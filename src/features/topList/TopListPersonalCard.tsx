import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../../constants";
import { GlassCard } from "../../ui";
import type { TopListEntry } from "./topListTypes";

type TopListPersonalCardProps = {
  entry: TopListEntry | null;
  hasPublishedFits: boolean;
  onPress: () => void;
};

function BarsIcon() {
  return (
    <View style={styles.iconBars}>
      <View style={[styles.bar, styles.barShort]} />
      <View style={[styles.bar, styles.barTall]} />
      <View style={[styles.bar, styles.barMedium]} />
    </View>
  );
}

export function TopListPersonalCard({
  entry,
  hasPublishedFits,
  onPress,
}: TopListPersonalCardProps) {
  const buttonLabel = entry || hasPublishedFits ? "View my fits" : "Add fit";

  return (
    <GlassCard style={styles.card}>
      <View style={styles.leftCluster}>
        <View style={styles.iconWrap}>
          <BarsIcon />
        </View>

        <View style={styles.copyWrap}>
          <Text style={styles.title}>Your best fit this week</Text>
          {entry ? (
            <>
              <Text style={styles.summary}>
                #{entry.rank} • {entry.avgGrade.toFixed(1)}
              </Text>
              <Text style={styles.subtitle}>
                {entry.gradeCount} {entry.gradeCount === 1 ? "rating" : "ratings"}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.summary}>No rated fits yet</Text>
              <Text style={styles.subtitle}>
                {hasPublishedFits
                  ? "Your published fits need ratings to show up here."
                  : "Publish your first fit to start ranking."}
              </Text>
            </>
          )}
        </View>
      </View>

      <Pressable onPress={onPress} style={styles.button}>
        <Text style={styles.buttonText}>{buttonLabel}</Text>
      </Pressable>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: theme.color.sepia,
    borderRadius: 999,
    width: 4,
  },
  barMedium: {
    height: 20,
  },
  barShort: {
    height: 12,
  },
  barTall: {
    height: 28,
  },
  button: {
    alignItems: "center",
    backgroundColor: "rgba(255,250,244,0.78)",
    borderColor: "rgba(194,162,132,0.56)",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: theme.color.sepia,
    fontSize: 13,
    fontWeight: "700",
  },
  card: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  copyWrap: {
    flex: 1,
    marginLeft: 12,
  },
  iconBars: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(255,250,244,0.92)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: 999,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  leftCluster: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    marginRight: 12,
  },
  subtitle: {
    color: theme.color.inkSoft,
    fontSize: 12.5,
    marginTop: 6,
  },
  summary: {
    color: theme.color.sepia,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  title: {
    color: theme.color.sepia,
    fontSize: 14,
    fontWeight: "600",
  },
});
