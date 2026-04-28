import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, type StyleProp, View, type ViewStyle } from "react-native";

import { theme } from "../constants";

type GlassCardProps = PropsWithChildren<{
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: "soft" | "warm";
}>;

export function GlassCard({
  children,
  onPress,
  style,
  variant = "soft",
}: GlassCardProps) {
  const cardStyles = [styles.base, variant === "warm" ? styles.warm : styles.soft, style];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [cardStyles, pressed ? styles.pressed : undefined]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyles}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 24,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.992 }],
  },
  soft: {
    backgroundColor: theme.color.glassStrong,
    borderColor: theme.color.border,
  },
  warm: {
    backgroundColor: "rgba(203, 180, 154, 0.42)",
    borderColor: "rgba(255,255,255,0.18)",
  },
});
