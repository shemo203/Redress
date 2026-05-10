import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../../constants";
import { GlassCard } from "../../ui";
import type { PendingTag } from "./types";
import { getTagBadgeLabel } from "./helpers";

export function TagCard({
  tag,
  onDelete,
  onEdit,
}: {
  onDelete: (tagId: string) => void;
  onEdit: (tag: PendingTag) => void;
  tag: PendingTag;
}) {
  return (
    <GlassCard onPress={() => onEdit(tag)} style={styles.itemCard}>
      <View style={styles.itemThumb}>
        <Text style={styles.itemThumbText}>{tag.name.trim().charAt(0).toUpperCase()}</Text>
      </View>

      <View style={styles.itemBody}>
        <Text numberOfLines={1} style={styles.itemName}>
          {tag.name}
        </Text>
        <Text numberOfLines={1} style={styles.itemBrand}>
          @{getTagBadgeLabel(tag)}
        </Text>
        <Text numberOfLines={1} style={styles.itemCategory}>
          {tag.category}
        </Text>
      </View>

      <Pressable
        hitSlop={10}
        onPress={(event) => {
          event.stopPropagation();
          onDelete(tag.id);
        }}
        style={({ pressed }) => [styles.itemDelete, pressed ? styles.pressed : undefined]}
      >
        <Text style={styles.itemDeleteText}>×</Text>
      </Pressable>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  itemBody: {
    flex: 1,
    gap: 4,
  },
  itemBrand: {
    color: theme.color.inkSoft,
    fontSize: 13,
    fontWeight: "600",
  },
  itemCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  itemCategory: {
    color: theme.color.accentBright,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  itemDelete: {
    alignItems: "center",
    backgroundColor: "rgba(255,109,104,0.14)",
    borderRadius: 999,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  itemDeleteText: {
    color: theme.color.danger,
    fontSize: 20,
    lineHeight: 22,
  },
  itemName: {
    color: theme.color.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  itemThumb: {
    alignItems: "center",
    backgroundColor: "rgba(203,180,154,0.26)",
    borderColor: "rgba(203,180,154,0.35)",
    borderRadius: 14,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  itemThumbText: {
    color: theme.color.accentBright,
    fontSize: 22,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.82,
  },
});
