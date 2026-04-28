import * as ImagePicker from "expo-image-picker";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  isModerationAdminUser,
  theme,
} from "../../src/constants";
import { useAuth } from "../../src/features/auth";
import {
  fetchMyPrivacyRequests,
  getPrivacyRequestLabel,
  PRIVACY_REQUEST_DETAILS_MAX_LENGTH,
  type PrivacyRequestRecord,
  type PrivacyRequestType,
  submitPrivacyRequest,
} from "../../src/features/privacy";
import { fetchFollowCounts, type FollowCounts } from "../../src/features/social";
import { supabase } from "../../src/lib/supabaseClient";
import { GlassButton, GlassCard, MediaSnapshot, ProfileAvatar } from "../../src/ui";
import { chrome } from "../../src/ui/chrome";

type AccountProfile = {
  avatar_url: string | null;
  bio: string | null;
  username: string;
};

type ProfileSummary = {
  avgGrade: number | null;
  draftCount: number;
  publishedCount: number;
  totalCount: number;
};

type FitPreview = {
  avgGrade: number | null;
  caption: string;
  created_at: string;
  id: string;
  media_type: "image" | "video";
  status: "draft" | "published";
  video_url: string | null;
};

const PROFILE_BIO_MAX_LENGTH = 160;

function formatUsername(raw: string | null | undefined) {
  if (raw && raw.trim().length > 0) {
    return raw.trim();
  }
  return "your.style";
}

function formatDisplayName(username: string) {
  const formatted = username
    .replace(/[_\.]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return formatted || "Your Profile";
}

function getRequestFailureMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return `${fallback}: ${error.message}`;
  }
  return fallback;
}

function formatCompactMetric(value: number) {
  if (value < 1000) {
    return `${value}`;
  }

  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value);
}

function ProfileGridTile({
  fit,
  onPress,
}: {
  fit: FitPreview;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.fitTile, pressed ? styles.fitTilePressed : undefined]}
    >
      <MediaSnapshot
        mediaType={fit.media_type}
        placeholderLabel={fit.media_type === "video" ? "Video" : "No media"}
        showVideoBadge={fit.media_type === "video"}
        style={styles.fitTileImage}
        uri={fit.video_url}
      />

      {fit.avgGrade != null ? (
        <View style={styles.fitScorePill}>
          <Text style={styles.fitScoreText}>{fit.avgGrade.toFixed(1)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const router = useRouter();
  const { profile, refreshProfile, user } = useAuth();

  const [accountCounts, setAccountCounts] = useState<FollowCounts | null>(null);
  const [accountProfile, setAccountProfile] = useState<AccountProfile | null>(null);
  const [editProfileAvatarUri, setEditProfileAvatarUri] = useState<string | null>(null);
  const [editProfileBio, setEditProfileBio] = useState("");
  const [editProfileMessage, setEditProfileMessage] = useState<string | null>(null);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [selectedAvatarAsset, setSelectedAvatarAsset] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingPrivacy, setIsSubmittingPrivacy] = useState(false);
  const [privacyDetails, setPrivacyDetails] = useState("");
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [privacyRequests, setPrivacyRequests] = useState<PrivacyRequestRecord[]>([]);
  const [privacySelection, setPrivacySelection] = useState<PrivacyRequestType | null>(null);
  const [privacyStatus, setPrivacyStatus] = useState<string | null>(null);
  const [summary, setSummary] = useState<ProfileSummary>({
    avgGrade: null,
    draftCount: 0,
    publishedCount: 0,
    totalCount: 0,
  });
  const [fits, setFits] = useState<FitPreview[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const loadProfileData = async () => {
        if (!user?.id) {
          if (!cancelled) {
            setAccountCounts(null);
            setAccountProfile(null);
            setFits([]);
            setPrivacyRequests([]);
            setIsLoading(false);
          }
          return;
        }

        setIsLoading(true);
        setStatusMessage(null);
        try {
          const [profileResult, postsResult, accountCountsResult] = await Promise.all([
            supabase
              .from("profiles")
              .select("username, avatar_url, bio")
              .eq("id", user.id)
              .maybeSingle(),
            supabase
              .from("video_posts")
              .select("id, caption, created_at, status, media_type, video_url")
              .eq("creator_id", user.id)
              .order("created_at", { ascending: false })
              .limit(24),
            fetchFollowCounts(user.id),
          ]);

          if (postsResult.error) {
            if (!cancelled) {
              setStatusMessage(`Failed to load profile stats: ${postsResult.error.message}`);
            }
            return;
          }

          if (profileResult.error && __DEV__) {
            console.error("Failed to load account profile", profileResult.error);
          }
          if (accountCountsResult.error && __DEV__) {
            console.error("Failed to load account follow counts", accountCountsResult.error);
          }

          const resolvedProfile: AccountProfile = {
            avatar_url: profileResult.data?.avatar_url ?? profile?.avatar_url ?? null,
            bio: profileResult.data?.bio ?? null,
            username: formatUsername(
              profileResult.data?.username ?? profile?.username ?? user.email?.split("@")[0]
            ),
          };

          const typedPosts = (postsResult.data ?? []) as Array<Omit<FitPreview, "avgGrade">>;
          const publishedPosts = typedPosts.filter((post) => post.status === "published");
          const publishedIds = publishedPosts.map((post) => post.id);

          let avgGrade: number | null = null;
          let gradeMap = new Map<string, number>();

          if (publishedIds.length > 0) {
            const { data: grades } = await supabase
              .from("grades")
              .select("post_id, value")
              .in("post_id", publishedIds);

            if (grades && grades.length > 0) {
              const groupedGrades = new Map<string, number[]>();
              for (const grade of grades) {
                const nextValues = groupedGrades.get(grade.post_id) ?? [];
                nextValues.push(grade.value);
                groupedGrades.set(grade.post_id, nextValues);
              }

              const perPostAverages = Array.from(groupedGrades.entries()).map(
                ([postId, values]) => {
                  const average =
                    Math.round(
                      (values.reduce((total, value) => total + value, 0) / values.length) *
                        10
                    ) / 10;
                  return [postId, average] as const;
                }
              );

              gradeMap = new Map(perPostAverages);
              avgGrade =
                Math.round(
                  (perPostAverages.reduce((total, [, value]) => total + value, 0) /
                    perPostAverages.length) *
                    10
                ) / 10;
            }
          }

          if (cancelled) {
            return;
          }

          setAccountProfile(resolvedProfile);
          setAccountCounts(accountCountsResult.error ? null : accountCountsResult.data);
          setSummary({
            avgGrade,
            draftCount: typedPosts.filter((post) => post.status === "draft").length,
            publishedCount: publishedPosts.length,
            totalCount: typedPosts.length,
          });
          setFits(
            publishedPosts.map((post) => ({
              ...post,
              avgGrade: gradeMap.get(post.id) ?? null,
            }))
          );

          const privacyRequestsResult = await fetchMyPrivacyRequests(user.id);

          if (cancelled) {
            return;
          }
          setPrivacyRequests(privacyRequestsResult.data);
          if (privacyRequestsResult.error) {
            setPrivacyStatus(privacyRequestsResult.error);
          }
        } catch (error) {
          if (!cancelled) {
            setStatusMessage(getRequestFailureMessage(error, "Failed to load profile stats"));
          }
          if (__DEV__) {
            console.error("Failed to load profile data", error);
          }
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
      };

      void loadProfileData();

      return () => {
        cancelled = true;
      };
    }, [profile?.avatar_url, profile?.username, user?.email, user?.id])
  );

  const handleSignOut = async () => {
    setStatusMessage(null);
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setStatusMessage(error.message);
        return;
      }

      setStatusMessage("Signed out.");
    } catch (error) {
      setStatusMessage(getRequestFailureMessage(error, "Sign out failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrivacySelection = (requestType: PrivacyRequestType) => {
    setPrivacySelection(requestType);
    setPrivacyStatus(null);
  };

  const handleSubmitPrivacyRequest = async () => {
    if (!user?.id || !privacySelection) {
      setPrivacyStatus("Choose a request type first.");
      return;
    }

    setIsSubmittingPrivacy(true);
    setPrivacyStatus(null);

    try {
      const result = await submitPrivacyRequest({
        details: privacyDetails,
        requesterId: user.id,
        requestType: privacySelection,
      });

      if (result.error) {
        setPrivacyStatus(result.error);
        return;
      }

      const reloadResult = await fetchMyPrivacyRequests(user.id);
      if (reloadResult.error) {
        setPrivacyStatus(reloadResult.error);
        return;
      }

      setPrivacyRequests(reloadResult.data);
      setPrivacyDetails("");
      setPrivacySelection(null);
      setPrivacyStatus(
        `${getPrivacyRequestLabel(
          privacySelection
        )} request submitted. We will handle this manually for MVP testing.`
      );
    } catch (error) {
      setPrivacyStatus(getRequestFailureMessage(error, "Could not submit privacy request"));
    } finally {
      setIsSubmittingPrivacy(false);
    }
  };

  const displayUsername = formatUsername(profile?.username ?? user?.email?.split("@")[0]);
  const resolvedUsername = accountProfile?.username ?? displayUsername;
  const displayName = formatDisplayName(resolvedUsername);
  const profileBio =
    accountProfile?.bio?.trim() ||
    "Curating conscious style | Based in Stockholm | Lover of linen and vintage finds";
  const canReviewReports = isModerationAdminUser(user?.id);
  const heroHeight = Math.max(250, Math.min(320, Math.round(screenHeight * 0.31)));

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `Check out @${resolvedUsername} on Redress.`,
      });
    } catch (error) {
      if (__DEV__) {
        console.error("Failed to share profile", error);
      }
      setStatusMessage("Could not open share sheet.");
    }
  };

  const handleOpenEditProfile = () => {
    setEditProfileAvatarUri(accountProfile?.avatar_url ?? profile?.avatar_url ?? null);
    setEditProfileBio(accountProfile?.bio?.trim() ?? "");
    setSelectedAvatarAsset(null);
    setEditProfileMessage(null);
    setEditProfileVisible(true);
  };

  const handlePickProfilePhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setEditProfileMessage("Media library permission is required to update your profile photo.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ["images"],
        quality: 0.9,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      if (!asset?.uri) {
        setEditProfileMessage("No image selected.");
        return;
      }

      setSelectedAvatarAsset(asset);
      setEditProfileAvatarUri(asset.uri);
      setEditProfileMessage(null);
    } catch (error) {
      setEditProfileMessage(getRequestFailureMessage(error, "Could not choose profile photo"));
      if (__DEV__) {
        console.error("Failed to pick avatar", error);
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) {
      setEditProfileMessage("You must be signed in.");
      return;
    }

    setIsSavingProfile(true);
    setEditProfileMessage(null);
    setStatusMessage(null);

    try {
      let nextAvatarUrl = accountProfile?.avatar_url ?? profile?.avatar_url ?? null;

      if (selectedAvatarAsset?.uri) {
        const response = await fetch(selectedAvatarAsset.uri);
        if (!response.ok) {
          throw new Error("Unable to read selected image.");
        }

        const imageBytes = await response.arrayBuffer();
        const extension =
          selectedAvatarAsset.fileName?.split(".").pop()?.toLowerCase() ||
          selectedAvatarAsset.mimeType?.split("/").pop()?.toLowerCase() ||
          "jpg";
        const filePath = `${user.id}/avatars/${Date.now()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(filePath, imageBytes, {
            contentType: selectedAvatarAsset.mimeType ?? `image/${extension}`,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Photo upload failed: ${uploadError.message}`);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("media").getPublicUrl(filePath);

        nextAvatarUrl = publicUrl;
      }

      const nextBio = editProfileBio.trim().slice(0, PROFILE_BIO_MAX_LENGTH);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: nextAvatarUrl,
          bio: nextBio.length > 0 ? nextBio : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        throw new Error(`Profile update failed: ${updateError.message}`);
      }

      setAccountProfile((current) =>
        current
          ? {
              ...current,
              avatar_url: nextAvatarUrl,
              bio: nextBio.length > 0 ? nextBio : null,
            }
          : {
              avatar_url: nextAvatarUrl,
              bio: nextBio.length > 0 ? nextBio : null,
              username: resolvedUsername,
            }
      );
      await refreshProfile();
      setEditProfileVisible(false);
      setSelectedAvatarAsset(null);
      setStatusMessage("Profile updated.");
    } catch (error) {
      setEditProfileMessage(getRequestFailureMessage(error, "Could not update profile"));
      if (__DEV__) {
        console.error("Failed to save profile", error);
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingBottom: Math.max(insets.bottom + 112, 132),
            paddingTop: Math.max(insets.top + 10, 24),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.topBarActions}>
            <Link asChild href="/(app)/search">
              <Pressable style={styles.topBarButton}>
                <Text style={styles.topBarButtonText}>Search</Text>
              </Pressable>
            </Link>

            <Pressable onPress={() => setMenuVisible(true)} style={styles.topBarMenuButton}>
              <Text style={styles.topBarMenuText}>☰</Text>
            </Pressable>
          </View>
        </View>

        <View
          pointerEvents="none"
          style={[styles.heroGlow, styles.heroGlowPrimary]}
        />
        <View
          pointerEvents="none"
          style={[styles.heroGlow, styles.heroGlowSecondary]}
        />

        <View style={[styles.profileHero, { minHeight: heroHeight }]}>
          {accountProfile?.avatar_url ?? profile?.avatar_url ? (
            <Image
              resizeMode="cover"
              source={{ uri: accountProfile?.avatar_url ?? profile?.avatar_url ?? "" }}
              style={styles.ghostPortrait}
            />
          ) : null}
          <View style={styles.ghostOverlay} />

          <View style={styles.avatarRing}>
            <ProfileAvatar
              avatarUrl={accountProfile?.avatar_url ?? profile?.avatar_url}
              size={114}
              username={resolvedUsername}
            />
          </View>

          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileHandle}>@{resolvedUsername}</Text>
          <Text numberOfLines={2} style={styles.profileBio}>
            {profileBio}
          </Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{formatCompactMetric(summary.totalCount)}</Text>
              <Text style={styles.heroStatLabel}>Posts</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>
                {formatCompactMetric(accountCounts?.followersCount ?? 0)}
              </Text>
              <Text style={styles.heroStatLabel}>Followers</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>
                {formatCompactMetric(accountCounts?.followingCount ?? 0)}
              </Text>
              <Text style={styles.heroStatLabel}>Following</Text>
            </View>
          </View>

          <View style={styles.heroActionsRow}>
            <GlassButton
              disabled={isSavingProfile}
              onPress={handleOpenEditProfile}
              style={styles.editProfileButton}
            >
              <Text style={styles.editProfileButtonText}>
                {isSavingProfile ? "Saving..." : "Edit Profile"}
              </Text>
            </GlassButton>
          </View>
        </View>

        <View style={styles.gridDivider}>
          <View style={styles.gridHandle} />
        </View>

        {isLoading ? (
          <GlassCard style={styles.loadingCard}>
            <ActivityIndicator color={theme.color.accentBright} />
            <Text style={styles.loadingText}>Loading your profile…</Text>
          </GlassCard>
        ) : fits.length === 0 ? (
          <GlassCard style={styles.emptyFitsCard}>
            <Text style={styles.emptyFitsTitle}>No published fits yet</Text>
            <Text style={styles.emptyFitsCopy}>
              Use the new post button in the dock to upload your first fit.
            </Text>
          </GlassCard>
        ) : (
          <View style={styles.fitGrid}>
            {fits.map((fit) => (
              <ProfileGridTile
                key={fit.id}
                fit={fit}
                onPress={() => {
                  router.push(`/(app)?postId=${fit.id}`);
                }}
              />
            ))}
          </View>
        )}

        {statusMessage ? <Text style={styles.inlineStatus}>{statusMessage}</Text> : null}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={menuVisible}
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuVisible(false)}>
          <Pressable
            style={[styles.menuPanel, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.menuHandle} />
            <ScrollView
              contentContainerStyle={styles.menuContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.menuHeader}>
                <View>
                  <Text style={chrome.eyebrow}>Menu</Text>
                  <Text style={styles.menuTitle}>Account</Text>
                </View>
                <Pressable onPress={() => setMenuVisible(false)} style={styles.menuClose}>
                  <Text style={styles.menuCloseText}>×</Text>
                </Pressable>
              </View>

              <View style={styles.accountInfoCard}>
                <Text style={styles.accountInfoLabel}>Signed in as</Text>
                <Text style={styles.accountInfoValue}>{user?.email ?? "-"}</Text>
                <Text style={styles.accountInfoHint}>
                  Manage your public profile, sharing, and privacy requests here.
                </Text>
              </View>

              <View style={styles.menuActionStack}>
                {user?.id ? (
                  <Link asChild href={`/(app)/profile/${user.id}`}>
                    <Pressable style={styles.menuActionItem}>
                      <View>
                        <Text style={styles.menuActionTitle}>View public profile</Text>
                        <Text style={styles.menuActionHint}>
                          See how your profile appears to other people
                        </Text>
                      </View>
                      <Text style={styles.menuActionChevron}>›</Text>
                    </Pressable>
                  </Link>
                ) : null}

                <Pressable
                  onPress={() => void handleShareProfile()}
                  style={styles.menuActionItem}
                >
                  <View>
                    <Text style={styles.menuActionTitle}>Share profile</Text>
                    <Text style={styles.menuActionHint}>
                      Send your Redress profile to someone else
                    </Text>
                  </View>
                  <Text style={styles.menuActionChevron}>›</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setMenuVisible(false);
                    setPrivacyModalVisible(true);
                    setPrivacyStatus(null);
                  }}
                  style={styles.menuActionItem}
                >
                  <View>
                    <Text style={styles.menuActionTitle}>Privacy & support</Text>
                    <Text style={styles.menuActionHint}>
                      Request data export or account deletion
                    </Text>
                  </View>
                  <Text style={styles.menuActionChevron}>›</Text>
                </Pressable>

                {canReviewReports ? (
                  <Link asChild href="/(app)/moderation/reports">
                    <Pressable style={styles.menuActionItem}>
                      <View>
                        <Text style={styles.menuActionTitle}>Reports review</Text>
                        <Text style={styles.menuActionHint}>
                          Open the moderation queue for submitted reports
                        </Text>
                      </View>
                      <Text style={styles.menuActionChevron}>›</Text>
                    </Pressable>
                  </Link>
                ) : null}
              </View>

              <Pressable
                disabled={isSubmitting}
                onPress={handleSignOut}
                style={[
                  styles.signOutButton,
                  isSubmitting ? styles.menuActionDisabled : undefined,
                ]}
              >
                <Text style={styles.signOutButtonText}>
                  {isSubmitting ? "Signing out..." : "Sign out"}
                </Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={editProfileVisible}
        onRequestClose={() => setEditProfileVisible(false)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setEditProfileVisible(false)}>
          <Pressable
            style={[styles.sheetPanel, { paddingBottom: Math.max(insets.bottom + 20, 28) }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.menuHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={chrome.eyebrow}>Profile</Text>
                <Text style={styles.menuTitle}>Edit profile</Text>
              </View>
              <Pressable
                onPress={() => setEditProfileVisible(false)}
                style={styles.menuClose}
              >
                <Text style={styles.menuCloseText}>×</Text>
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.editProfilePreview}>
                <View style={styles.editProfileAvatarWrap}>
                  <ProfileAvatar
                    avatarUrl={editProfileAvatarUri}
                    size={112}
                    username={resolvedUsername}
                  />
                </View>
                <Pressable
                  onPress={() => void handlePickProfilePhoto()}
                  style={styles.profileActionButtonGhost}
                >
                  <Text style={styles.profileActionTextGhost}>Change photo</Text>
                </Pressable>
              </View>

              <View style={styles.editSection}>
                <Text style={styles.editLabel}>Description</Text>
                <TextInput
                  multiline
                  maxLength={PROFILE_BIO_MAX_LENGTH}
                  onChangeText={setEditProfileBio}
                  placeholder="Tell people a little about your style"
                  placeholderTextColor={theme.color.inkSoft}
                  style={styles.editInput}
                  textAlignVertical="top"
                  value={editProfileBio}
                />
                <Text style={styles.editHint}>
                  {editProfileBio.trim().length}/{PROFILE_BIO_MAX_LENGTH}
                </Text>
              </View>

              {editProfileMessage ? <Text style={styles.status}>{editProfileMessage}</Text> : null}

              <View style={styles.sheetActionsRow}>
                <Pressable
                  onPress={() => setEditProfileVisible(false)}
                  style={[styles.profileActionButtonGhost, styles.sheetSecondaryButton]}
                >
                  <Text style={styles.profileActionTextGhost}>Cancel</Text>
                </Pressable>
                <Pressable
                  disabled={isSavingProfile}
                  onPress={() => void handleSaveProfile()}
                  style={[
                    styles.profileActionButton,
                    styles.sheetPrimaryButton,
                    isSavingProfile ? styles.menuActionDisabled : undefined,
                  ]}
                >
                  <Text style={styles.profileActionText}>
                    {isSavingProfile ? "Saving..." : "Save changes"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={privacyModalVisible}
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setPrivacyModalVisible(false)}>
          <Pressable
            style={[styles.sheetPanel, { paddingBottom: Math.max(insets.bottom + 20, 28) }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.menuHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={chrome.eyebrow}>Privacy</Text>
                <Text style={styles.menuTitle}>Privacy & support</Text>
              </View>
              <Pressable
                onPress={() => setPrivacyModalVisible(false)}
                style={styles.menuClose}
              >
                <Text style={styles.menuCloseText}>×</Text>
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.accountInfoCard}>
                <Text style={styles.accountInfoValue}>Need help with your data?</Text>
                <Text style={styles.accountInfoHint}>
                  During beta, export and deletion requests are handled manually. Send the
                  request here and it will be reviewed outside the app.
                </Text>
              </View>

              <Text style={styles.editLabel}>Optional note</Text>
              <TextInput
                multiline
                onChangeText={setPrivacyDetails}
                placeholder="Add context if you want us to process this in a specific way"
                placeholderTextColor={theme.color.inkSoft}
                style={styles.editInput}
                textAlignVertical="top"
                value={privacyDetails}
              />
              <Text style={styles.editHint}>
                {privacyDetails.trim().length}/{PRIVACY_REQUEST_DETAILS_MAX_LENGTH}
              </Text>

              <View style={styles.sheetActionStack}>
                <Pressable
                  onPress={() => handlePrivacySelection("data_export")}
                  style={[
                    styles.menuActionItem,
                    privacySelection === "data_export"
                      ? styles.menuActionItemActive
                      : undefined,
                  ]}
                >
                  <View>
                    <Text style={styles.menuActionTitle}>Request data export</Text>
                    <Text style={styles.menuActionHint}>
                      Ask for a copy of the data linked to your account
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => handlePrivacySelection("account_deletion")}
                  style={[
                    styles.menuActionItem,
                    privacySelection === "account_deletion"
                      ? styles.menuActionItemActive
                      : undefined,
                  ]}
                >
                  <View>
                    <Text style={styles.menuActionTitle}>Request account deletion</Text>
                    <Text style={styles.menuActionHint}>
                      Ask for removal of your Redress account and related data
                    </Text>
                  </View>
                </Pressable>
              </View>

              {privacySelection ? (
                <View style={styles.confirmCard}>
                  <Text style={styles.confirmTitle}>
                    Confirm {getPrivacyRequestLabel(privacySelection).toLowerCase()}
                  </Text>
                  <Text style={styles.confirmCopy}>
                    {privacySelection === "account_deletion"
                      ? "This creates a manual request for account and related-data deletion. It is not instant in the beta."
                      : "This creates a manual request for a copy of the data associated with your account. It is not generated instantly in the beta."}
                  </Text>
                  <Pressable
                    disabled={isSubmittingPrivacy}
                    onPress={() => void handleSubmitPrivacyRequest()}
                    style={[
                      styles.profileActionButton,
                      styles.confirmButton,
                      isSubmittingPrivacy ? styles.menuActionDisabled : undefined,
                    ]}
                  >
                    <Text style={styles.profileActionText}>
                      {isSubmittingPrivacy ? "Submitting..." : "Submit request"}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={styles.historySection}>
                <Text style={styles.editLabel}>Recent requests</Text>
                {privacyRequests.length === 0 ? (
                  <Text style={styles.historyEmpty}>No privacy requests submitted yet.</Text>
                ) : (
                  privacyRequests.map((request) => (
                    <View key={request.id} style={styles.historyRow}>
                      <Text style={styles.historyTitle}>
                        {getPrivacyRequestLabel(request.request_type)}
                      </Text>
                      <Text style={styles.historyMeta}>
                        {request.status} · {new Date(request.created_at).toLocaleString()}
                      </Text>
                      {request.details ? (
                        <Text style={styles.historyDetails}>{request.details}</Text>
                      ) : null}
                    </View>
                  ))
                )}
              </View>

              {privacyStatus ? <Text style={styles.status}>{privacyStatus}</Text> : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  avatarRing: {
    alignItems: "center",
    backgroundColor: "rgba(251, 247, 241, 0.6)",
    borderColor: "rgba(188, 157, 126, 0.8)",
    borderRadius: 999,
    borderWidth: 4,
    justifyContent: "center",
    marginBottom: 12,
    padding: 5,
    shadowColor: "#9b7a63",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
  },
  container: {
    backgroundColor: "#f7f1e8",
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  debugButton: {
    alignItems: "center",
    backgroundColor: theme.color.accentBright,
    borderRadius: theme.radius.pill,
    flex: 1,
    paddingVertical: 10,
  },
  debugButtonDisabled: {
    opacity: 0.5,
  },
  debugButtonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  debugButtonText: {
    color: theme.color.white,
    fontSize: 12,
    fontWeight: "700",
  },
  debugCard: {
    backgroundColor: "rgba(255,249,243,0.92)",
    borderColor: theme.color.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginTop: 18,
    padding: theme.spacing.md,
  },
  debugEmpty: {
    color: theme.color.muted,
    marginTop: 8,
  },
  debugError: {
    color: theme.color.danger,
  },
  debugHeading: {
    color: theme.color.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  debugHint: {
    color: theme.color.muted,
    fontSize: 12,
    marginTop: 4,
  },
  debugInput: {
    backgroundColor: "rgba(255,250,246,0.98)",
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.color.ink,
    marginTop: 6,
    padding: 12,
  },
  debugInputTall: {
    minHeight: 88,
  },
  debugLabel: {
    color: theme.color.inkSoft,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 12,
  },
  debugLink: {
    color: theme.color.accentBright,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
  },
  debugOk: {
    color: theme.color.accentBright,
  },
  debugRow: {
    borderTopColor: theme.color.border,
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 10,
  },
  debugValue: {
    color: theme.color.ink,
    fontSize: 12,
    marginTop: 2,
  },
  emptyFitsCard: {
    backgroundColor: "rgba(255,249,243,0.84)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
  },
  emptyFitsCopy: {
    color: theme.color.inkSoft,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6,
  },
  emptyFitsTitle: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 26,
    fontWeight: "700",
  },
  fitGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
  },
  fitScorePill: {
    backgroundColor: "rgba(246, 233, 219, 0.78)",
    borderColor: "rgba(255,255,255,0.65)",
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    position: "absolute",
    right: 8,
    top: 8,
  },
  fitScoreText: {
    color: "#ca8b71",
    fontFamily: Platform.select({ ios: "Avenir Next", default: undefined }),
    fontSize: 13,
    fontWeight: "600",
  },
  fitTile: {
    borderRadius: 20,
    height: 192,
    overflow: "hidden",
    position: "relative",
    width: "31.8%",
  },
  fitTilePressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  fitTileImage: {
    height: "100%",
    width: "100%",
  },
  gridDivider: {
    alignItems: "center",
    borderTopColor: "rgba(210,178,148,0.62)",
    borderTopWidth: 1,
    marginBottom: 16,
    marginTop: 10,
    paddingTop: 9,
  },
  gridHandle: {
    backgroundColor: "rgba(222,203,181,0.95)",
    borderRadius: 999,
    height: 8,
    width: 68,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  headerTag: {
    alignItems: "center",
    backgroundColor: "rgba(203, 180, 154, 0.54)",
    borderColor: "rgba(255,255,255,0.20)",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minWidth: 88,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTagText: {
    color: theme.color.white,
    fontSize: 12,
    fontWeight: "700",
  },
  heroActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    width: "100%",
  },
  heroGlow: {
    backgroundColor: "rgba(233, 214, 190, 0.44)",
    borderRadius: 320,
    height: 260,
    position: "absolute",
    width: 260,
  },
  heroGlowPrimary: {
    left: -22,
    top: 28,
  },
  heroGlowSecondary: {
    opacity: 0.48,
    right: -32,
    top: 70,
  },
  heroStat: {
    alignItems: "center",
    flex: 1,
  },
  heroStatLabel: {
    color: "#6e5648",
    fontFamily: Platform.select({ ios: "Avenir Next", default: undefined }),
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 15,
    marginTop: 3,
  },
  heroStatValue: {
    color: "#5b4030",
    fontFamily: Platform.select({ ios: "Georgia-Bold", default: "serif" }),
    fontSize: 28,
    fontWeight: "700",
  },
  heroStatsRow: {
    flexDirection: "row",
    marginTop: 16,
    width: "100%",
  },
  infoCard: {
    backgroundColor: "rgba(255,249,243,0.86)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 18,
    padding: 18,
  },
  infoLabel: {
    color: theme.color.inkSoft,
    fontSize: 13,
    marginTop: 8,
  },
  infoMetaPill: {
    backgroundColor: "rgba(203, 180, 154, 0.16)",
    borderColor: "rgba(203, 180, 154, 0.20)",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  infoMetaPillText: {
    color: theme.color.inkSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  infoMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  infoValue: {
    color: theme.color.ink,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 4,
  },
  inlineStatus: {
    color: theme.color.inkSoft,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 18,
    textAlign: "center",
  },
  loadingCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,243,0.84)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
  },
  loadingText: {
    color: theme.color.inkSoft,
    marginTop: 10,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 10,
    position: "relative",
    zIndex: 3,
  },
  topBarActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  topBarButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,250,246,0.72)",
    borderColor: "rgba(222,203,181,0.88)",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 88,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#9b7a63",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
  },
  topBarButtonText: {
    color: theme.color.inkSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  topBarMenuButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,250,246,0.72)",
    borderColor: "rgba(222,203,181,0.88)",
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    shadowColor: "#9b7a63",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    width: 44,
  },
  topBarMenuText: {
    color: theme.color.inkSoft,
    fontSize: 22,
    fontWeight: "400",
    marginTop: -1,
  },
  accountInfoCard: {
    backgroundColor: "rgba(255,249,243,0.88)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 18,
    padding: 18,
  },
  accountInfoHint: {
    color: theme.color.inkSoft,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  accountInfoLabel: {
    color: theme.color.inkSoft,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  accountInfoValue: {
    color: theme.color.ink,
    fontFamily: Platform.select({ ios: "Georgia-Bold", default: "serif" }),
    fontSize: 22,
    fontWeight: "700",
    marginTop: 6,
  },
  confirmButton: {
    marginTop: 14,
  },
  confirmCard: {
    backgroundColor: "rgba(255,250,246,0.98)",
    borderColor: theme.color.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginTop: 18,
    padding: 16,
  },
  confirmCopy: {
    color: theme.color.inkSoft,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  confirmTitle: {
    color: theme.color.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  editHint: {
    color: theme.color.muted,
    fontSize: 12,
    marginTop: 8,
    textAlign: "right",
  },
  editInput: {
    backgroundColor: "rgba(255,250,246,0.98)",
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.color.ink,
    marginTop: 8,
    minHeight: 104,
    padding: 14,
  },
  editLabel: {
    color: theme.color.inkSoft,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  editProfileAvatarWrap: {
    alignItems: "center",
    backgroundColor: "rgba(251, 247, 241, 0.8)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    padding: 6,
  },
  editProfilePreview: {
    alignItems: "center",
    gap: 14,
  },
  editSection: {
    marginTop: 20,
  },
  historyDetails: {
    color: theme.color.inkSoft,
    fontSize: 12,
    marginTop: 4,
  },
  historyEmpty: {
    color: theme.color.muted,
    marginTop: 8,
  },
  historyMeta: {
    color: theme.color.muted,
    fontSize: 12,
    marginTop: 2,
  },
  historyRow: {
    borderTopColor: theme.color.border,
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 10,
  },
  historySection: {
    marginTop: 18,
  },
  historyTitle: {
    color: theme.color.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  menuBackdrop: {
    backgroundColor: "rgba(20,14,11,0.28)",
    flex: 1,
    justifyContent: "flex-end",
  },
  menuClose: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  menuCloseText: {
    color: theme.color.inkSoft,
    fontSize: 28,
    fontWeight: "300",
  },
  menuContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  menuHandle: {
    alignSelf: "center",
    backgroundColor: "rgba(209,188,164,0.9)",
    borderRadius: 999,
    height: 6,
    marginBottom: 14,
    width: 72,
  },
  menuHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  menuPanel: {
    backgroundColor: theme.color.shell,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "82%",
    paddingTop: 12,
  },
  menuActionChevron: {
    color: "#b58f74",
    fontSize: 24,
    fontWeight: "300",
  },
  menuActionDisabled: {
    opacity: 0.55,
  },
  menuActionHint: {
    color: theme.color.inkSoft,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    maxWidth: 250,
  },
  menuActionItem: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,243,0.9)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 78,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  menuActionItemActive: {
    borderColor: "rgba(208, 156, 128, 0.92)",
    borderWidth: 1.5,
  },
  menuActionStack: {
    gap: 12,
    marginTop: 18,
  },
  menuActionTitle: {
    color: theme.color.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  menuTitle: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 24,
    fontWeight: "700",
    marginTop: 4,
  },
  moderationLink: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,243,0.92)",
    borderColor: theme.color.border,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    marginTop: 12,
    paddingVertical: 12,
  },
  moderationLinkText: {
    color: theme.color.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  sheetActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  sheetActionStack: {
    gap: 12,
    marginTop: 18,
  },
  sheetContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  sheetPanel: {
    backgroundColor: theme.color.shell,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "88%",
    paddingTop: 12,
  },
  sheetPrimaryButton: {
    flex: 1,
  },
  sheetSecondaryButton: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  signOutButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,243,0.9)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 50,
  },
  signOutButtonText: {
    color: theme.color.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  profileActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  profileActionButton: {
    alignItems: "center",
    backgroundColor: theme.color.accentBright,
    borderRadius: theme.radius.pill,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  profileActionButtonGhost: {
    backgroundColor: "rgba(255,249,243,0.9)",
    borderColor: "rgba(216,206,194,0.88)",
    borderWidth: 1,
  },
  profileActionText: {
    color: theme.color.white,
    fontSize: 14,
    fontWeight: "700",
  },
  profileActionTextGhost: {
    color: theme.color.ink,
  },
  profileBio: {
    color: "#6b5448",
    fontFamily: Platform.select({ ios: "Avenir Next", default: undefined }),
    fontSize: 13.5,
    fontWeight: "500",
    lineHeight: 19,
    marginTop: 10,
    maxWidth: 330,
    textAlign: "center",
  },
  profileHandle: {
    color: "#c0a186",
    fontFamily: Platform.select({ ios: "Avenir Next", default: undefined }),
    fontSize: 18,
    fontWeight: "500",
    marginTop: 2,
  },
  profileHero: {
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 24,
    position: "relative",
  },
  profileName: {
    color: "#654636",
    fontFamily: Platform.select({ ios: "Georgia-Bold", default: "serif" }),
    fontSize: 33,
    fontWeight: "700",
    marginTop: 10,
    textAlign: "center",
  },
  ghostOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(247, 241, 232, 0.74)",
  },
  ghostPortrait: {
    height: "128%",
    left: "50%",
    opacity: 0.12,
    position: "absolute",
    top: -18,
    transform: [{ translateX: -170 }],
    width: 340,
  },
  editProfileButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 251, 247, 0.54)",
    borderColor: "rgba(208, 156, 128, 0.92)",
    borderRadius: theme.radius.pill,
    borderWidth: 1.8,
    flex: 1,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: 24,
    shadowColor: "#b28669",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
  },
  editProfileButtonText: {
    color: "#664636",
    fontFamily: Platform.select({ ios: "Georgia-Bold", default: "serif" }),
    fontSize: 18,
    fontWeight: "700",
  },
  status: {
    color: theme.color.inkSoft,
    marginTop: 12,
    textAlign: "center",
  },
});
