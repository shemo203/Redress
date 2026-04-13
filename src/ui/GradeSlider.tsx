import { useCallback, useRef, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";

import { theme } from "../constants";

type GradeSliderProps = {
  disabled?: boolean;
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  value: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const THUMB_SIZE = 30;

export function GradeSlider({
  disabled = false,
  max = 10,
  min = 1,
  onChange,
  onSlidingComplete,
  value,
}: GradeSliderProps) {
  const trackRef = useRef<View | null>(null);
  const trackPageXRef = useRef(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const safeValue =
    Number.isFinite(value) && Number.isInteger(value)
      ? clamp(value, min, max)
      : min;
  const ratio = (safeValue - min) / (max - min);
  const usableTrackWidth = Math.max(trackWidth - THUMB_SIZE, 0);
  const thumbLeft = usableTrackWidth * ratio;
  const fillWidth =
    trackWidth > 0 ? clamp(thumbLeft + THUMB_SIZE / 2, 0, trackWidth) : 0;

  const measureTrack = useCallback(() => {
    trackRef.current?.measureInWindow((pageX, _pageY, width) => {
      if (width > 0) {
        trackPageXRef.current = pageX;
        setTrackWidth(width);
      }
    });
  }, []);

  const resolveValue = useCallback(
    (locationX?: number, pageX?: number) => {
      if (trackWidth <= 0) {
        return safeValue;
      }

      let nextLocation = locationX;
      if (!Number.isFinite(nextLocation)) {
        if (!Number.isFinite(pageX)) {
          return safeValue;
        }
        nextLocation = pageX! - trackPageXRef.current;
      }

      const clampedX = clamp(nextLocation ?? 0, 0, trackWidth);
      const nextRatio = clampedX / trackWidth;
      return clamp(Math.round(min + nextRatio * (max - min)), min, max);
    },
    [max, min, safeValue, trackWidth]
  );

  const updateFromGesture = useCallback(
    (locationX?: number, pageX?: number) => {
      if (disabled) {
        return;
      }

      const nextValue = resolveValue(locationX, pageX);
      if (nextValue !== safeValue) {
        onChange(nextValue);
      }
    },
    [disabled, onChange, resolveValue, safeValue]
  );

  const finishFromGesture = useCallback(
    (locationX?: number, pageX?: number) => {
      if (disabled) {
        return;
      }

      const nextValue = resolveValue(locationX, pageX);
      onChange(nextValue);
      onSlidingComplete?.(nextValue);
    },
    [disabled, onChange, onSlidingComplete, resolveValue]
  );

  const handleTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
    measureTrack();
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.trackShell}>
        <View
          ref={trackRef}
          onLayout={handleTrackLayout}
          onMoveShouldSetResponder={() => !disabled}
          onResponderGrant={(event) => {
            measureTrack();
            updateFromGesture(
              event.nativeEvent.locationX,
              event.nativeEvent.pageX
            );
          }}
          onResponderMove={(event) => {
            updateFromGesture(undefined, event.nativeEvent.pageX);
          }}
          onResponderRelease={(event) => {
            finishFromGesture(undefined, event.nativeEvent.pageX);
          }}
          onResponderTerminate={(event) => {
            finishFromGesture(undefined, event.nativeEvent.pageX);
          }}
          onResponderTerminationRequest={() => false}
          onStartShouldSetResponder={() => !disabled}
          style={[styles.track, disabled ? styles.trackDisabled : undefined]}
        >
          <View style={[styles.trackFill, { width: fillWidth }]} />
          <View
            style={[
              styles.thumb,
              disabled ? styles.thumbDisabled : undefined,
              { left: thumbLeft },
            ]}
          />
        </View>
      </View>

      <View style={styles.endLabelRow}>
        <Text style={styles.endLabel}>{min}</Text>
        <Text style={styles.endLabel}>{max}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: {
    backgroundColor: theme.color.accentBright,
    borderColor: theme.color.white,
    borderRadius: 999,
    borderWidth: 3,
    height: THUMB_SIZE,
    position: "absolute",
    top: -11,
    width: THUMB_SIZE,
  },
  thumbDisabled: {
    opacity: 0.65,
  },
  endLabel: {
    color: theme.color.inkSoft,
    fontSize: 12,
    fontWeight: "600",
  },
  endLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  track: {
    backgroundColor: "rgba(140,120,110,0.16)",
    borderRadius: 999,
    height: 8,
    justifyContent: "center",
  },
  trackDisabled: {
    opacity: 0.65,
  },
  trackFill: {
    backgroundColor: theme.color.accentBright,
    borderRadius: 999,
    height: "100%",
  },
  trackShell: {
    paddingVertical: 12,
  },
  wrap: {
    marginTop: 10,
  },
});
