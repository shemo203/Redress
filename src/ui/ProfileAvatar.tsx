import { Image, StyleSheet, Text, View } from "react-native";

import { theme } from "../constants";

type ProfileAvatarProps = {
  avatarUrl?: string | null;
  size?: number;
  username?: string | null;
};

export function ProfileAvatar({
  avatarUrl,
  size = 72,
  username,
}: ProfileAvatarProps) {
  const initial = username?.trim().charAt(0).toUpperCase() || "?";

  return (
    <View
      style={[
        styles.wrap,
        {
          borderRadius: size / 2,
          height: size,
          width: size,
        },
      ]}
    >
      {avatarUrl?.trim() ? (
        <Image source={{ uri: avatarUrl }} style={styles.image} />
      ) : (
        <Text
          style={[
            styles.initial,
            {
              fontSize: Math.max(18, Math.round(size * 0.36)),
            },
          ]}
        >
          {initial}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    height: "100%",
    width: "100%",
  },
  initial: {
    color: theme.color.inkSoft,
    fontFamily: "serif",
    fontWeight: "700",
  },
  wrap: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,243,0.9)",
    borderColor: "rgba(216,206,194,0.88)",
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden",
  },
});
