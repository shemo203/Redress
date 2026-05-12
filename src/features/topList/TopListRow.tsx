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
          {entry.itemCount} {entry.itemCount === 1 ? "item" : "items"}
        </Text>
      </View>

      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chevron: {
    color: "rgba(140,120,110,0.85)",
    fontSize: 34,
    lineHeight: 34,
    marginLeft: 8,
  },
  meta: {
    flex: 1,
    marginLeft: 14,
  },
  rank: {
    color: theme.color.sepia,
    fontSize: 21,
    fontWeight: "600",
    marginRight: 12,
    minWidth: 22,
    textAlign: "center",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  rowDivider: {
    borderBottomColor: "rgba(216,206,194,0.82)",
    borderBottomWidth: 1,
  },
  score: {
    color: theme.color.sepia,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "right",
  },
  scoreWrap: {
    minWidth: 72,
  },
  subtle: {
    color: theme.color.inkSoft,
    fontSize: 12,
    marginTop: 4,
  },
  thumbnail: {
    borderRadius: 16,
    height: 58,
    width: 58,
  },
  username: {
    color: theme.color.sepia,
    fontSize: 17,
    fontWeight: "700",
  },
});
