import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "../../constants";
import { useAuth } from "../auth";
import {
  fetchHasPublishedFits,
  fetchMyBestRankedPost,
  fetchTopPosts,
} from "./topListApi";
import { TopListPeriodControl } from "./TopListPeriodControl";
import { TopListPersonalCard } from "./TopListPersonalCard";
import { TopListPodium } from "./TopListPodium";
import { TopListRow } from "./TopListRow";
import { type TopListEntry, type TopListPeriod } from "./topListTypes";
import { subscribeToAppDockRetap } from "../../ui/appDockEvents";
import { GlassCard } from "../../ui";

export function TopListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const hasLoadedRef = useRef(false);
  const { user } = useAuth();

  const [selectedPeriod, setSelectedPeriod] = useState<TopListPeriod>("today");
  const [entries, setEntries] = useState<TopListEntry[]>([]);
  const [myBestFit, setMyBestFit] = useState<TopListEntry | null>(null);
  const [hasPublishedFits, setHasPublishedFits] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSwitchingPeriod, setIsSwitchingPeriod] = useState(false);

  const listEntries = useMemo(() => entries.filter((entry) => entry.rank >= 4).slice(0, 5), [entries]);

  const openPost = useCallback(
    (postId: string) => {
      router.push({
        params: { postId },
        pathname: "/(app)",
      });
    },
    [router]
  );

  const handleMyFitsPress = useCallback(() => {
    if (!user?.id) {
      return;
    }

    if (hasPublishedFits) {
      router.push("/(app)/account");
      return;
    }

    router.push("/(app)/upload");
  }, [hasPublishedFits, router, user?.id]);

  const loadTopList = useCallback(
    async (
      period: TopListPeriod,
      mode: "initial" | "period" | "refresh" = "initial"
    ) => {
      if (!user?.id) {
        return;
      }

      if (mode === "refresh") {
        setIsRefreshing(true);
      } else if (mode === "period" && hasLoadedRef.current) {
        setIsSwitchingPeriod(true);
      } else {
        setIsLoading(true);
      }

      const [topResult, myBestResult, hasFitsResult] = await Promise.all([
        fetchTopPosts(period, 8),
        fetchMyBestRankedPost("week"),
        fetchHasPublishedFits(user.id),
      ]);

      setEntries(topResult.data);
      setMyBestFit(myBestResult.data);
      setHasPublishedFits(hasFitsResult.data);
      setErrorMessage(topResult.error);

      if (__DEV__) {
        if (myBestResult.error) {
          console.error("Failed to load personal top-list card", myBestResult.error);
        }
        if (hasFitsResult.error) {
          console.error("Failed to check published fits for top-list card", hasFitsResult.error);
        }
      }

      hasLoadedRef.current = true;
      setIsLoading(false);
      setIsRefreshing(false);
      setIsSwitchingPeriod(false);
    },
    [user?.id]
  );

  useEffect(() => {
    void loadTopList(selectedPeriod, hasLoadedRef.current ? "period" : "initial");
  }, [loadTopList, selectedPeriod]);

  useEffect(() => {
    return subscribeToAppDockRetap("top-list", () => {
      scrollRef.current?.scrollTo({ animated: true, y: 0 });
    });
  }, []);

  const topEmpty = !isLoading && entries.length === 0 && !errorMessage;

  return (
    <ScrollView
      ref={scrollRef}
      refreshControl={
        <RefreshControl
          onRefresh={() => void loadTopList(selectedPeriod, "refresh")}
          refreshing={isRefreshing}
          tintColor={theme.color.accentBright}
        />
      }
      contentContainerStyle={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom + 166, 196),
          paddingTop: Math.max(insets.top + 18, 30),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerBlock}>
        <Text style={styles.headerTitle}>Top List</Text>
        <Text style={styles.headerSubtitle}>Best rated fits on Redress</Text>
      </View>

      <TopListPeriodControl onChange={setSelectedPeriod} selectedPeriod={selectedPeriod} />

      {isSwitchingPeriod ? (
        <Text style={styles.inlineLoading}>
          Updating{" "}
          {selectedPeriod === "today"
            ? "today"
            : selectedPeriod === "week"
              ? "this week"
              : "all-time"}{" "}
          leaderboard…
        </Text>
      ) : null}

      {isLoading ? (
        <GlassCard style={styles.stateCard}>
          <ActivityIndicator color={theme.color.accentBright} />
          <Text style={styles.stateTitle}>Loading the Top List…</Text>
          <Text style={styles.stateText}>We’re pulling the highest-rated fits right now.</Text>
        </GlassCard>
      ) : null}

      {!isLoading && errorMessage ? (
        <GlassCard style={styles.stateCard}>
          <Text style={styles.stateTitle}>Top List unavailable</Text>
          <Text style={styles.stateText}>{errorMessage}</Text>
          <Pressable
            onPress={() => void loadTopList(selectedPeriod, "refresh")}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </GlassCard>
      ) : null}

      {topEmpty ? (
        <GlassCard style={styles.stateCard}>
          <Text style={styles.stateTitle}>No ranked fits yet</Text>
          <Text style={styles.stateText}>
            Be the first to publish and get rated.
          </Text>
          <Pressable onPress={() => router.push("/(app)/upload")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Add fit</Text>
          </Pressable>
        </GlassCard>
      ) : null}

      {!isLoading && !errorMessage && entries.length > 0 ? (
        <>
          <View style={styles.sectionGap}>
            <TopListPodium entries={entries.slice(0, 3)} onPressEntry={openPost} period={selectedPeriod} />
          </View>

          {listEntries.length > 0 ? (
            <GlassCard style={styles.rankListCard}>
              {listEntries.map((entry, index) => (
                <TopListRow
                  key={entry.postId}
                  entry={entry}
                  isLast={index === listEntries.length - 1}
                  onPress={() => openPost(entry.postId)}
                />
              ))}
            </GlassCard>
          ) : null}
        </>
      ) : null}

      <View style={styles.personalCardWrap}>
        <TopListPersonalCard
          entry={myBestFit}
          hasPublishedFits={hasPublishedFits}
          onPress={handleMyFitsPress}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.color.cream,
    flexGrow: 1,
    paddingHorizontal: 22,
  },
  headerBlock: {
    marginBottom: 20,
  },
  headerSubtitle: {
    color: theme.color.inkSoft,
    fontSize: 18,
    lineHeight: 24,
    marginTop: 6,
  },
  headerTitle: {
    color: theme.color.sepia,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
  },
  inlineLoading: {
    color: theme.color.inkSoft,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 12,
    textAlign: "center",
  },
  personalCardWrap: {
    marginTop: 22,
  },
  primaryButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: theme.color.accentBright,
    borderRadius: theme.radius.pill,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 50,
    paddingHorizontal: 22,
  },
  primaryButtonText: {
    color: theme.color.white,
    fontSize: 15,
    fontWeight: "700",
  },
  rankListCard: {
    marginTop: 28,
    overflow: "hidden",
    paddingVertical: 2,
  },
  sectionGap: {
    marginTop: 26,
  },
  stateCard: {
    alignItems: "center",
    marginTop: 28,
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  stateText: {
    color: theme.color.inkSoft,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    textAlign: "center",
  },
  stateTitle: {
    color: theme.color.sepia,
    fontSize: 22,
    fontWeight: "700",
    marginTop: 14,
    textAlign: "center",
  },
});
