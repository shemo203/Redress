import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { theme } from "../../constants";
import {
  REPORT_DETAILS_MAX_LENGTH,
  REPORT_REASONS,
  type ReportReason,
} from "./index";

type ReportComposerProps = {
  initialDetails?: string;
  isSubmitting: boolean;
  message: string | null;
  onClose: () => void;
  onSubmit: (input: { details: string; reason: ReportReason }) => void;
  subtitle: string;
  title: string;
  visible: boolean;
};

export function ReportComposer({
  initialDetails = "",
  isSubmitting,
  message,
  onClose,
  onSubmit,
  subtitle,
  title,
  visible,
}: ReportComposerProps) {
  const [details, setDetails] = useState(initialDetails);
  const [reason, setReason] = useState<ReportReason | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setDetails(initialDetails);
    setReason(null);
  }, [initialDetails, visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <Text style={styles.label}>Reason</Text>
          <View style={styles.reasonWrap}>
            {REPORT_REASONS.map((option) => (
              <Pressable
                key={option}
                disabled={isSubmitting}
                onPress={() => setReason(option)}
                style={[
                  styles.reasonChip,
                  reason === option ? styles.reasonChipActive : undefined,
                ]}
              >
                <Text
                  style={[
                    styles.reasonChipText,
                    reason === option ? styles.reasonChipTextActive : undefined,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Details</Text>
          <TextInput
            editable={!isSubmitting}
            multiline
            maxLength={REPORT_DETAILS_MAX_LENGTH}
            onChangeText={setDetails}
            placeholder="Optional details"
            placeholderTextColor={theme.color.muted}
            style={styles.input}
            textAlignVertical="top"
            value={details}
          />
          <Text style={styles.helperText}>
            {details.trim().length}/{REPORT_DETAILS_MAX_LENGTH}
          </Text>

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <Pressable
            disabled={isSubmitting || !reason}
            onPress={() => {
              if (!reason) {
                return;
              }
              onSubmit({
                details,
                reason,
              });
            }}
            style={[
              styles.submitButton,
              isSubmitting || !reason ? styles.submitButtonDisabled : undefined,
            ]}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? "Submitting..." : "Submit report"}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.42)",
    flex: 1,
    justifyContent: "flex-end",
  },
  helperText: {
    color: theme.color.muted,
    fontSize: 12,
    marginTop: 6,
    textAlign: "right",
  },
  input: {
    backgroundColor: "rgba(255,250,246,0.98)",
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.color.ink,
    fontSize: 14,
    minHeight: 118,
    padding: 12,
  },
  label: {
    color: theme.color.ink,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 16,
  },
  message: {
    color: theme.color.accentBright,
    fontSize: 13,
    marginTop: 12,
  },
  panel: {
    backgroundColor: theme.color.shell,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: "84%",
    padding: 18,
  },
  reasonChip: {
    backgroundColor: "rgba(255,250,246,0.98)",
    borderColor: theme.color.border,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    marginRight: 8,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  reasonChipActive: {
    backgroundColor: theme.color.accentBright,
    borderColor: theme.color.accentBright,
  },
  reasonChipText: {
    color: theme.color.ink,
    fontSize: 13,
    fontWeight: "600",
  },
  reasonChipTextActive: {
    color: theme.color.white,
  },
  reasonWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: theme.color.accentBright,
    borderRadius: theme.radius.pill,
    marginTop: 16,
    paddingVertical: 13,
  },
  submitButtonDisabled: {
    backgroundColor: "#d7b4b0",
  },
  submitButtonText: {
    color: theme.color.white,
    fontWeight: "700",
  },
  subtitle: {
    color: theme.color.muted,
    fontSize: 13,
    marginTop: 4,
  },
  title: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 24,
    fontWeight: "700",
  },
});
