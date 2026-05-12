import { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextLayoutEventData,
  type TextStyle,
  View,
} from "react-native";
import type { NativeSyntheticEvent } from "react-native";

import { theme } from "../constants";

type ExpandableProfileBioProps = {
  collapsedLines?: number;
  text: string;
  textStyle?: StyleProp<TextStyle>;
};

export function ExpandableProfileBio({
  collapsedLines = 2,
  text,
  textStyle,
}: ExpandableProfileBioProps) {
  const [didMeasure, setDidMeasure] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isExpandable, setIsExpandable] = useState(false);

  useEffect(() => {
    setDidMeasure(false);
    setExpanded(false);
    setIsExpandable(false);
  }, [collapsedLines, text]);

  const handleMeasure = (event: NativeSyntheticEvent<TextLayoutEventData>) => {
    if (didMeasure) {
      return;
    }

    setIsExpandable(event.nativeEvent.lines.length > collapsedLines);
    setDidMeasure(true);
  };

  return (
    <View style={styles.wrap}>
      {!didMeasure ? (
        <View
          accessibilityElementsHidden
          collapsable={false}
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={styles.measureWrap}
        >
          <Text onTextLayout={handleMeasure} style={textStyle}>
            {text}
          </Text>
        </View>
      ) : null}

      <Text numberOfLines={expanded ? undefined : collapsedLines} style={textStyle}>
        {text}
      </Text>

      {isExpandable ? (
        <Pressable
          hitSlop={8}
          onPress={() => setExpanded((current) => !current)}
          style={({ pressed }) => [styles.toggleButton, pressed ? styles.pressed : undefined]}
        >
          <Text style={styles.toggleText}>{expanded ? "Show less" : "Read more"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  measureWrap: {
    alignItems: "center",
    left: 0,
    opacity: 0,
    position: "absolute",
    right: 0,
    top: 0,
    width: "100%",
  },
  pressed: {
    opacity: 0.78,
  },
  toggleButton: {
    marginTop: 8,
  },
  toggleText: {
    color: theme.color.accentBright,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  wrap: {
    alignItems: "center",
    width: "100%",
  },
});
