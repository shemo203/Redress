import { usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "../constants";
import { BrandMark } from "./BrandMark";

function ProfileGlyph({ active = false }: { active?: boolean }) {
  return (
    <View style={styles.profileGlyph}>
      <View
        style={[
          styles.profileHead,
          active ? styles.iconStrokeActive : styles.iconStroke,
        ]}
      />
      <View
        style={[
          styles.profileBody,
          active ? styles.iconStrokeActive : styles.iconStroke,
        ]}
      />
    </View>
  );
}

export function AppDock() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isUpload = pathname.startsWith("/(app)/upload");
  const isAccount = pathname.startsWith("/(app)/account");

  return (
    <View
      pointerEvents="box-none"
      style={[styles.dockWrap, { paddingBottom: Math.max(insets.bottom, 3) }]}
    >
      <View style={styles.bar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/(app)/upload")}
          style={styles.sideItem}
        >
          <View style={[styles.iconCircle, isUpload ? styles.iconCircleActive : undefined]}>
            <Text style={[styles.plus, isUpload ? styles.plusActive : undefined]}>+</Text>
          </View>
          <Text style={[styles.sideLabel, isUpload ? styles.activeLabel : undefined]}>
            New Post
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/(app)")}
          style={styles.centerItem}
        >
          <BrandMark elevated size={54} variant="chrome" />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/(app)/account")}
          style={styles.sideItem}
        >
          <View style={[styles.iconCircle, isAccount ? styles.iconCircleActive : undefined]}>
            <ProfileGlyph active={isAccount} />
          </View>
          <Text style={[styles.sideLabel, isAccount ? styles.activeLabel : undefined]}>
            Profile
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  activeLabel: {
    color: theme.color.ink,
  },
  bar: {
    alignItems: "flex-end",
    backgroundColor: "#f1ede7",
    borderTopColor: "rgba(117,110,103,0.14)",
    borderTopWidth: 1,
    flexDirection: "row",
    height: 54,
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 1,
    paddingTop: 2,
  },
  centerItem: {
    alignItems: "center",
    marginTop: -16,
    minWidth: 62,
  },
  dockWrap: {
    backgroundColor: "#f1ede7",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
  },
  iconCircle: {
    alignItems: "center",
    backgroundColor: theme.color.shell,
    borderColor: "rgba(140,120,110,0.18)",
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  iconCircleActive: {
    borderColor: theme.color.accentBright,
    borderWidth: 2,
  },
  iconStroke: {
    borderColor: theme.color.inkSoft,
  },
  iconStrokeActive: {
    borderColor: theme.color.accentBright,
  },
  plus: {
    color: theme.color.inkSoft,
    fontSize: 21,
    fontWeight: "300",
    marginTop: -2,
  },
  plusActive: {
    color: theme.color.accentBright,
  },
  profileBody: {
    borderRadius: 999,
    borderWidth: 2,
    borderTopWidth: 0,
    height: 10,
    marginTop: 2,
    width: 14,
  },
  profileGlyph: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 0,
  },
  profileHead: {
    borderRadius: 999,
    borderWidth: 2,
    height: 8,
    width: 8,
  },
  sideItem: {
    alignItems: "center",
    gap: 3,
    minWidth: 64,
  },
  sideLabel: {
    color: theme.color.inkSoft,
    fontSize: 10,
    fontWeight: "500",
  },
});
