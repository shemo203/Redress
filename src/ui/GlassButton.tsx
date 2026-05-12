import type { PropsWithChildren } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { theme } from "../constants";

type GlassButtonProps = PropsWithChildren<{
  disabled?: boolean;
  label?: string;
  minHeight?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  variant?: "accent" | "cream" | "soft";
}>;

export function GlassButton({
  children,
  disabled = false,
  label,
  minHeight = 46,
  onPress,
  style,
  textStyle,
  variant = "cream",
}: GlassButtonProps) {
  const buttonStyles = [
    styles.base,
    variant === "accent"
      ? styles.accent
      : variant === "soft"
        ? styles.soft
        : styles.cream,
    { minHeight },
    style,
  ];

  const textStyles = [
    styles.textBase,
    variant === "accent"
      ? styles.textAccent
      : variant === "soft"
        ? styles.textSoft
        : styles.textCream,
    textStyle,
  ];

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        buttonStyles,
        disabled ? styles.disabled : undefined,
        pressed && !disabled ? styles.pressed : undefined,
      ]}
    >
      {typeof children === "string" || label ? (
        <Text style={textStyles}>{label ?? children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  accent: {
    backgroundColor: theme.color.accentBright,
    borderColor: theme.color.accentBright,
  },
  base: {
    alignItems: "center",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cream: {
    backgroundColor: "rgba(255, 251, 247, 0.54)",
    borderColor: theme.color.warmBorder,
    ...theme.shadow.softLift,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.992 }],
  },
  soft: {
    backgroundColor: theme.color.creamSoft,
    borderColor: theme.color.border,
    shadowColor: "#9b7a63",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  textAccent: {
    color: theme.color.white,
    fontFamily: "System",
    fontSize: 13,
    fontWeight: "700",
  },
  textBase: {
    letterSpacing: 0.1,
  },
  textCream: {
    color: theme.color.sepia,
    fontFamily: "serif",
    fontSize: 16,
    fontWeight: "700",
  },
  textSoft: {
    color: theme.color.ink,
    fontFamily: "System",
    fontSize: 13,
    fontWeight: "600",
  },
});
