import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../../constants";
import { MediaSnapshot } from "../../ui";
import { getTopRatedLabel, type TopListEntry, type TopListPeriod } from "./topListTypes";

const crownIcon = require("../../../assets/pNGGGGG.png");

type TopListPodiumProps = {
  entries: TopListEntry[];
  onPressEntry: (postId: string) => void;
  period: TopListPeriod;
};

type PodiumCardProps = {
  entry?: TopListEntry;
  isCenter?: boolean;
  onPressEntry: (postId: string) => void;
  rank: 1 | 2 | 3;
  showChampionLabel?: boolean;
  period: TopListPeriod;
};

function getBadgeStyle(rank: 1 | 2 | 3) {
  if (rank === 1) {
    return styles.rankBadgeGold;
  }

  if (rank === 2) {
    return styles.rankBadgeSilver;
  }

  return styles.rankBadgeBronze;
}

function PodiumCard({
  entry,
  isCenter = false,
  onPressEntry,
  rank,
  showChampionLabel = false,
  period,
}: PodiumCardProps) {
  const frameStyle = isCenter ? styles.centerFrame : styles.sideFrame;
  const columnStyle = isCenter ? styles.centerColumn : styles.sideColumn;

  return (
    <View style={columnStyle}>
      {entry ? (
        <Pressable onPress={() => onPressEntry(entry.postId)} style={frameStyle}>
          <MediaSnapshot
            mediaType={entry.mediaType}
            showVideoBadge={entry.mediaType === "video"}
            style={styles.mediaFrame}
            uri={entry.videoUrl}
          />

          <View style={[styles.rankBadge, getBadgeStyle(rank)]}>
            <Text style={styles.rankBadgeText}>{rank}</Text>
          </View>

          <View style={styles.scoreOverlay}>
            <Text style={styles.scoreText}>{entry.avgGrade.toFixed(1)}</Text>
            <Text style={styles.scoreMeta}>
              {entry.gradeCount} {entry.gradeCount === 1 ? "rating" : "ratings"}
            </Text>
          </View>
        </Pressable>
      ) : (
        <View style={[frameStyle, styles.placeholderFrame]}>
          <View style={[styles.rankBadge, getBadgeStyle(rank)]}>
            <Text style={styles.rankBadgeText}>{rank}</Text>
          </View>
          <Text style={styles.placeholderTitle}>Open rank</Text>
          <Text style={styles.placeholderCopy}>Waiting for ratings</Text>
        </View>
      )}

      <Text numberOfLines={1} style={styles.username}>
        {entry ? `@${entry.username}` : "—"}
      </Text>
      {showChampionLabel ? (
        <View style={styles.championLabelRow}>
          <Image source={crownIcon} resizeMode="contain" style={styles.championCrown} />
          <Text style={styles.championLabel}>{getTopRatedLabel(period).replace("👑 ", "")}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function TopListPodium({ entries, onPressEntry, period }: TopListPodiumProps) {
  const rankOne = entries.find((entry) => entry.rank === 1);
  const rankTwo = entries.find((entry) => entry.rank === 2);
  const rankThree = entries.find((entry) => entry.rank === 3);

  return (
    <View style={styles.wrap}>
      <PodiumCard entry={rankTwo} onPressEntry={onPressEntry} period={period} rank={2} />
      <PodiumCard
        entry={rankOne}
        isCenter
        onPressEntry={onPressEntry}
        period={period}
        rank={1}
        showChampionLabel
      />
      <PodiumCard entry={rankThree} onPressEntry={onPressEntry} period={period} rank={3} />
    </View>
  );
}

const styles = StyleSheet.create({
  centerColumn: {
    alignItems: "center",
    flex: 1.1,
  },
  centerFrame: {
    borderRadius: 24,
    height: 320,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  championCrown: {
    height: 18,
    width: 22,
  },
  championLabel: {
    color: theme.color.warmGold,
    fontSize: 13,
    fontWeight: "700",
  },
  championLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  mediaFrame: {
    borderRadius: 24,
    height: "100%",
    width: "100%",
  },
  placeholderCopy: {
    color: theme.color.inkSoft,
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
  },
  placeholderFrame: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,243,0.66)",
    borderColor: "rgba(216,206,194,0.92)",
    borderStyle: "dashed",
    borderWidth: 1.5,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  placeholderTitle: {
    color: theme.color.inkSoft,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 18,
  },
  rankBadge: {
    alignItems: "center",
    borderRadius: theme.radius.pill,
    height: 42,
    justifyContent: "center",
    left: 14,
    position: "absolute",
    top: 14,
    width: 42,
  },
  rankBadgeBronze: {
    backgroundColor: "#d89a5d",
  },
  rankBadgeGold: {
    backgroundColor: "#f3c95f",
  },
  rankBadgeSilver: {
    backgroundColor: "#d4d2d0",
  },
  rankBadgeText: {
    color: theme.color.white,
    fontSize: 24,
    fontWeight: "700",
  },
  scoreMeta: {
    color: theme.color.white,
    fontSize: 13,
    marginTop: 4,
  },
  scoreOverlay: {
    backgroundColor: "rgba(30, 25, 22, 0.54)",
    borderBottomLeftRadius: 24,
    borderTopRightRadius: 24,
    bottom: 0,
    left: 0,
    paddingHorizontal: 14,
    paddingVertical: 14,
    position: "absolute",
  },
  scoreText: {
    color: theme.color.white,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  sideColumn: {
    alignItems: "center",
    flex: 0.9,
    marginTop: 28,
  },
  sideFrame: {
    borderRadius: 24,
    height: 268,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  username: {
    color: theme.color.sepia,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 12,
  },
  wrap: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 14,
  },
});
