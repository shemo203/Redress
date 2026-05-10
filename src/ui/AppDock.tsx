import { usePathname, useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "../constants";
import { useAuth } from "../features/auth";
import { type AppDockDestination, emitAppDockRetap } from "./appDockEvents";
import { BrandMark } from "./BrandMark";

const dockRouteConfig: Record<
  AppDockDestination,
  {
    href: "/(app)" | "/(app)/account" | "/(app)/upload";
    matches: (pathname: string) => boolean;
  }
> = {
  account: {
    href: "/(app)/account",
    matches: (pathname) => pathname.startsWith("/account"),
  },
  feed: {
    href: "/(app)",
    matches: (pathname) => pathname === "/",
  },
  upload: {
    href: "/(app)/upload",
    matches: (pathname) => pathname.startsWith("/upload"),
  },
};

function getActiveDockDestination(pathname: string): AppDockDestination | null {
  return (
    (Object.entries(dockRouteConfig).find(([, config]) => config.matches(pathname))?.[0] as
      | AppDockDestination
      | undefined) ?? null
  );
}

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

  const normalizedPath = pathname === "" ? "/" : pathname;
  const activeDestination = getActiveDockDestination(normalizedPath);
  const avatarUri = profile?.avatar_url?.trim() || null;

  const handleDockPress = (destination: AppDockDestination) => {
    if (activeDestination === destination) {
      emitAppDockRetap(destination);
      return;
    }
    router.replace(dockRouteConfig[destination].href);
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.dockWrap, { paddingBottom: Math.max(insets.bottom - 6, 2) }]}
    >
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          onPress={() => handleDockPress("upload")}
          style={[
            styles.sideCircle,
            styles.leftSideCircle,
            activeDestination === "upload" ? styles.sideCircleActive : undefined,
          ]}
        >
          <Text
            style={[
              styles.plus,
              activeDestination === "upload" ? styles.plusActive : undefined,
            ]}
          >
            +
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => handleDockPress("feed")}
          style={styles.centerItem}
        >
          <BrandMark
            badgeStyle={styles.centerBadge}
            elevated
            showWordmark
            size={114}
            variant="chrome"
          />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => handleDockPress("account")}
          style={[
            styles.sideCircle,
            styles.rightSideCircle,
            activeDestination === "account" ? styles.sideCircleActive : undefined,
          ]}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <ProfileGlyph active={activeDestination === "account"} />
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
    transform: [{ translateY: 52 }],
  },
  centerBadge: {
    backgroundColor: "rgba(203, 180, 154, 0.54)",
    borderColor: "rgba(255,255,255,0.20)",
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
    transform: [{ translateX: 2 }, { translateY: 28 }],
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
    transform: [{ translateX: -2 }, { translateY: 28 }],
  },
  sideCircle: {
    alignItems: "center",
    backgroundColor: "rgba(203, 180, 154, 0.54)",
    borderColor: "rgba(255,255,255,0.20)",
    borderRadius: 999,
    borderWidth: 1,
    height: 64,
    justifyContent: "center",
    shadowColor: "#6f5b4b",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
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
