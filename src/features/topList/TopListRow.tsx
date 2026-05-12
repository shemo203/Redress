import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../../constants";
import { MediaSnapshot } from "../../ui";
import type { TopListEntry } from "./topListTypes";

type TopListRowProps = {
  entry: TopListEntry;
  isLast?: boolean;
  onPress: () => void;
};

export function TopListRow({ entry, isLast = false, onPress }: TopListRowProps) {
  return (
    <Pressable onPress={onPress} style={[styles.row, !isLast ? styles.rowDivider : undefined]}>
      <Text style={styles.rank}>{entry.rank}</Text>

      <MediaSnapshot
        mediaType={entry.mediaType}
        showVideoBadge={entry.mediaType === "video"}
        style={styles.thumbnail}
        uri={entry.videoUrl}
      />

      <View style={styles.meta}>
        <Text numberOfLines={1} style={styles.username}>
          @{entry.username}
        </Text>
        <Text style={styles.subtle}>
          {entry.gradeCount} {entry.gradeCount === 1 ? "rating" : "ratings"}
        </Text>
      </View>

      <View style={styles.scoreWrap}>
        <Text style={styles.score}>{entry.avgGrade.toFixed(1)}</Text>
        <Text style={styles.subtle}>
          {entry.itemCount} {entry.itemCount === 1 ? "piece" : "pieces"}
        </Text>
      </View>

      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chevron: {
    color: "rgba(140,120,110,0.85)",
    fontSize: 28,
    lineHeight: 28,
    marginLeft: 6,
  },
  meta: {
    flex: 1,
    marginLeft: 12,
  },
  rank: {
    color: theme.color.sepia,
    fontSize: 19,
    fontWeight: "600",
    marginRight: 10,
    minWidth: 22,
    textAlign: "center",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  rowDivider: {
    borderBottomColor: "rgba(216,206,194,0.82)",
    borderBottomWidth: 1,
  },
  score: {
    color: theme.color.sepia,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "right",
  },
  scoreWrap: {
    minWidth: 66,
  },
  subtle: {
    color: theme.color.inkSoft,
    fontSize: 11.5,
    marginTop: 3,
  },
  thumbnail: {
    borderRadius: 14,
    height: 50,
    width: 50,
  },
  username: {
    color: theme.color.sepia,
    fontSize: 15,
    fontWeight: "700",
  },
});
