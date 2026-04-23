import { usePathname, useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "../constants";
import { useAuth } from "../features/auth";
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
  const { profile } = useAuth();

  const isUpload = pathname.startsWith("/(app)/upload");
  const isAccount = pathname.startsWith("/(app)/account");
  const avatarUri = profile?.avatar_url?.trim() || null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.dockWrap, { paddingBottom: Math.max(insets.bottom - 10, 0) }]}
    >
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/(app)/upload")}
          style={[
            styles.sideCircle,
            styles.leftSideCircle,
            isUpload ? styles.sideCircleActive : undefined,
          ]}
        >
          <Text style={[styles.plus, isUpload ? styles.plusActive : undefined]}>+</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/(app)")}
          style={styles.centerItem}
        >
          <BrandMark elevated showWordmark size={114} variant="chrome" />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/(app)/account")}
          style={[
            styles.sideCircle,
            styles.rightSideCircle,
            isAccount ? styles.sideCircleActive : undefined,
          ]}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <ProfileGlyph active={isAccount} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: 999,
    height: "100%",
    width: "100%",
  },
  centerItem: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 124,
    transform: [{ translateY: 58 }],
  },
  dockWrap: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
  },
  plus: {
    color: theme.color.inkSoft,
    fontSize: 34,
    fontWeight: "300",
    marginTop: -4,
  },
  plusActive: {
    color: theme.color.accentBright,
  },
  leftSideCircle: {
    transform: [{ translateX: -10 }, { translateY: 34 }],
  },
  profileBody: {
    borderRadius: 999,
    borderWidth: 2.2,
    borderTopWidth: 0,
    height: 10,
    marginTop: 3,
    width: 15,
  },
  profileGlyph: {
    alignItems: "center",
    justifyContent: "center",
  },
  profileHead: {
    borderRadius: 999,
    borderWidth: 2.2,
    height: 9,
    width: 9,
  },
  row: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 0,
  },
  rightSideCircle: {
    transform: [{ translateX: 10 }, { translateY: 34 }],
  },
  sideCircle: {
    alignItems: "center",
    backgroundColor: "rgba(239, 219, 185, 0.94)",
    borderColor: "rgba(255,255,255,0.76)",
    borderRadius: 999,
    borderWidth: 1,
    height: 64,
    justifyContent: "center",
    shadowColor: "#6f5b4b",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    width: 64,
  },
  sideCircleActive: {
    borderColor: theme.color.accentBright,
    borderWidth: 2,
  },
  iconStroke: {
    borderColor: theme.color.inkSoft,
  },
  iconStrokeActive: {
    borderColor: theme.color.accentBright,
  },
});
