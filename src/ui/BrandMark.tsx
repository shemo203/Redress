import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { theme } from "../constants";

const redressLogo = require("../../assets/redress-logo.png");

type BrandMarkProps = {
  badgeStyle?: StyleProp<ViewStyle>;
  compact?: boolean;
  elevated?: boolean;
  showLabel?: boolean;
  symbolOnly?: boolean;
  showWordmark?: boolean;
  size?: number;
  variant?: "accent" | "chrome";
};

export function BrandMark({
  badgeStyle,
  compact = false,
  elevated = false,
  symbolOnly = false,
  showWordmark = false,
  size = 86,
  variant = "accent",
}: BrandMarkProps) {
  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.badge,
          variant === "chrome" ? styles.badgeChrome : undefined,
          compact ? styles.badgeCompact : undefined,
          elevated ? styles.badgeElevated : undefined,
          badgeStyle,
          { height: size, width: size },
        ]}
      >
        {showWordmark ? (
          <Image
            source={redressLogo}
            style={[
              styles.wordmarkLogo,
              styles.wordmarkLogoTint,
              {
                height: size * 0.92,
                width: size * 0.92,
              },
            ]}
            resizeMode="contain"
          />
        ) : (
          <Image
            source={redressLogo}
            style={[
              symbolOnly ? styles.logoAsset : styles.logo,
              compact ? styles.logoCompact : undefined,
              !symbolOnly && (variant === "chrome" ? styles.logoChrome : styles.logoAccent),
              {
                height: symbolOnly ? size * 0.84 : size * 1.6,
                width: symbolOnly ? size * 0.84 : size * 1.6,
              },
            ]}
            resizeMode={symbolOnly ? "contain" : "cover"}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    backgroundColor: theme.color.shell,
    borderColor: "rgba(140,120,110,0.18)",
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    justifyContent: "center",
    overflow: "hidden",
  },
  badgeCompact: {
    paddingTop: 8,
  },
  badgeChrome: {
    backgroundColor: "#efdbb9",
    borderColor: "rgba(194, 162, 132, 0.32)",
  },
  badgeElevated: {
    shadowColor: "#7f6658",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  logo: {
    marginTop: -2,
  },
  logoAccent: {
    tintColor: theme.color.accentBright,
  },
  logoChrome: {
    tintColor: theme.color.accentBright,
  },
  logoCompact: {
    marginTop: 0,
  },
  logoAsset: {
    marginTop: 0,
  },
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  wordmarkLogo: {
    marginTop: 2,
  },
  wordmarkLogoTint: {
    tintColor: theme.color.accentBright,
  },
});
