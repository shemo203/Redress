import { usePathname, useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "../constants";
import { useAuth } from "../features/auth";
import { type AppDockDestination, emitAppDockRetap } from "./appDockEvents";
import { BrandMark } from "./BrandMark";

const searchIcon = require("../../assets/IMG_6086.png");
const topListIcon = require("../../assets/IMG_2124.png");

type DockRoute = AppDockDestination | "search";

const dockRouteConfig: Record<
  DockRoute,
  {
    href: "/(app)" | "/(app)/account" | "/(app)/top-list" | "/(app)/upload" | "/(app)/search";
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
  search: {
    href: "/(app)/search",
    matches: (pathname) => pathname.startsWith("/search"),
  },
  "top-list": {
    href: "/(app)/top-list",
    matches: (pathname) => pathname.startsWith("/top-list"),
  },
  upload: {
    href: "/(app)/upload",
    matches: (pathname) => pathname.startsWith("/upload"),
  },
};

function getActiveDockDestination(pathname: string): DockRoute | null {
  return (
    (Object.entries(dockRouteConfig).find(([, config]) => config.matches(pathname))?.[0] as
      | DockRoute
      | undefined) ?? null
  );
}

function SearchGlyph({ active = false }: { active?: boolean }) {
  return (
    <Image
      source={searchIcon}
      resizeMode="contain"
      style={[
        styles.assetGlyph,
        { tintColor: active ? theme.color.accentBright : "rgba(119,101,87,0.88)" },
      ]}
    />
  );
}

function TopListGlyph({ active = false }: { active?: boolean }) {
  return (
    <Image
      source={topListIcon}
      resizeMode="contain"
      style={[
        styles.assetGlyph,
        { tintColor: active ? theme.color.accentBright : "rgba(119,101,87,0.88)" },
      ]}
    />
  );
}

function PlusGlyph({ active = false }: { active?: boolean }) {
  return (
    <View style={styles.plusGlyph}>
      <View style={[styles.plusVertical, active ? styles.plusActive : styles.plusInactive]} />
      <View style={[styles.plusHorizontal, active ? styles.plusActive : styles.plusInactive]} />
    </View>
  );
}

function ProfileGlyph({ active = false }: { active?: boolean }) {
  return (
    <View style={styles.profileGlyph}>
      <View
        style={[
          styles.profileHead,
          active ? styles.navIconStrokeActive : styles.navIconStroke,
        ]}
      />
      <View
        style={[
          styles.profileBody,
          active ? styles.navIconStrokeActive : styles.navIconStroke,
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
  const dockBottom = Math.max(insets.bottom - 24, 0);

  const handleDockPress = (destination: DockRoute) => {
    if (activeDestination === destination) {
      if (
        destination === "feed" ||
        destination === "account" ||
        destination === "top-list" ||
        destination === "upload"
      ) {
        emitAppDockRetap(destination);
      }
      return;
    }
    router.replace(dockRouteConfig[destination].href);
  };

  return (
    <View pointerEvents="box-none" style={styles.dockWrap}>
      <View style={[styles.dockPanel, { bottom: dockBottom }]}>
        <View style={styles.sideCluster}>
          <Pressable
            accessibilityRole="button"
            onPress={() => handleDockPress("search")}
            style={styles.navItem}
          >
            <SearchGlyph active={activeDestination === "search"} />
            <Text
              style={[
                styles.navLabel,
                activeDestination === "search" ? styles.navLabelActive : undefined,
              ]}
            >
              Search
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => handleDockPress("top-list")}
            style={styles.navItem}
          >
            <TopListGlyph active={activeDestination === "top-list"} />
            <Text
              style={[
                styles.navLabel,
                activeDestination === "top-list" ? styles.navLabelActive : undefined,
              ]}
            >
              Top List
            </Text>
          </Pressable>
        </View>

        <View style={styles.centerSpacer} />

        <View style={styles.sideCluster}>
          <Pressable
            accessibilityRole="button"
            onPress={() => handleDockPress("upload")}
            style={styles.navItem}
          >
            <PlusGlyph active={activeDestination === "upload"} />
            <Text
              style={[
                styles.navLabel,
                activeDestination === "upload" ? styles.navLabelActive : undefined,
              ]}
            >
              Add fit
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => handleDockPress("account")}
            style={styles.navItem}
          >
            <View style={styles.profileIconWrap}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <ProfileGlyph active={activeDestination === "account"} />
              )}
            </View>
            <Text
              style={[
                styles.navLabel,
                activeDestination === "account" ? styles.navLabelActive : undefined,
              ]}
            >
              Profile
            </Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => handleDockPress("feed")}
        style={[styles.centerButtonWrap, { bottom: dockBottom }]}
      >
        <BrandMark
          badgeStyle={[
            styles.centerBadge,
            activeDestination === "feed" ? styles.centerBadgeActive : undefined,
          ]}
          elevated
          size={92}
          symbolOnly
          variant="chrome"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  assetGlyph: {
    height: 26,
    width: 26,
  },
  avatar: {
    borderRadius: 999,
    height: "100%",
    width: "100%",
  },
  centerBadge: {
    backgroundColor: "rgba(239, 219, 185, 0.98)",
    borderColor: "rgba(255,255,255,0.42)",
    borderRadius: 999,
    borderWidth: 1.5,
  },
  centerBadgeActive: {
    borderColor: theme.color.accentBright,
  },
  centerButtonWrap: {
    alignItems: "center",
    justifyContent: "center",
    left: "50%",
    marginLeft: -46,
    position: "absolute",
    zIndex: 4,
  },
  centerSpacer: {
    width: 78,
  },
  dockWrap: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
  },
  dockPanel: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(239, 219, 185, 0.96)",
    borderColor: "rgba(255,255,255,0.38)",
    borderRadius: 24,
    borderWidth: 1.2,
    flexDirection: "row",
    justifyContent: "space-between",
    maxWidth: 430,
    minHeight: 66,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 6,
    position: "absolute",
    shadowColor: "#7f6658",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    width: "92%",
  },
  navIconStroke: {
    borderColor: "rgba(119,101,87,0.88)",
  },
  navIconStrokeActive: {
    borderColor: theme.color.accentBright,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    width: 52,
  },
  navLabel: {
    color: "rgba(106,88,73,0.9)",
    fontSize: 9,
    fontWeight: "500",
    marginTop: 5,
    textAlign: "center",
  },
  navLabelActive: {
    color: theme.color.accentBright,
    fontWeight: "700",
  },
  plusActive: {
    backgroundColor: theme.color.accentBright,
  },
  plusGlyph: {
    alignItems: "center",
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  plusHorizontal: {
    borderRadius: 999,
    height: 2.2,
    position: "absolute",
    width: 18,
  },
  plusInactive: {
    backgroundColor: "rgba(119,101,87,0.88)",
  },
  plusVertical: {
    borderRadius: 999,
    height: 18,
    position: "absolute",
    width: 2.2,
  },
  profileBody: {
    borderRadius: 999,
    borderWidth: 1.7,
    borderTopWidth: 0,
    height: 8,
    marginTop: 2,
    width: 12,
  },
  profileGlyph: {
    alignItems: "center",
    justifyContent: "center",
  },
  profileHead: {
    borderRadius: 999,
    borderWidth: 1.7,
    height: 7,
    width: 7,
  },
  profileIconWrap: {
    alignItems: "center",
    borderRadius: 999,
    height: 22,
    justifyContent: "center",
    overflow: "hidden",
    width: 22,
  },
  sideCluster: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
});
