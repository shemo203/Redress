import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../../constants";
import { TOP_LIST_PERIODS, type TopListPeriod } from "./topListTypes";

type TopListPeriodControlProps = {
  onChange: (period: TopListPeriod) => void;
  selectedPeriod: TopListPeriod;
};

export function TopListPeriodControl({
  onChange,
  selectedPeriod,
}: TopListPeriodControlProps) {
  return (
    <View style={styles.wrap}>
      {TOP_LIST_PERIODS.map((period, index) => {
        const isActive = period.key === selectedPeriod;

        return (
          <Pressable
            key={period.key}
            accessibilityRole="button"
            onPress={() => onChange(period.key)}
            style={[
              styles.segment,
              isActive ? styles.segmentActive : undefined,
              index > 0 ? styles.segmentDivider : undefined,
            ]}
          >
            <Text style={[styles.label, isActive ? styles.labelActive : undefined]}>
              {period.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: theme.color.sepia,
    fontSize: 15,
    fontWeight: "700",
  },
  labelActive: {
    color: theme.color.accentBright,
  },
  segment: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 12,
  },
  segmentActive: {
    backgroundColor: "rgba(247, 221, 217, 0.46)",
  },
  segmentDivider: {
    borderLeftColor: "rgba(216,206,194,0.9)",
    borderLeftWidth: 1,
  },
  wrap: {
    backgroundColor: "rgba(255,250,244,0.92)",
    borderColor: "rgba(216,206,194,0.92)",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
  },
});
