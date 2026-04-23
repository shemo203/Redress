import { Redirect, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { isModerationAdminUser, theme } from "../../../src/constants";
import { useAuth } from "../../../src/features/auth";
import {
  fetchReportsForReview,
  REPORT_REASONS,
  type ModerationReportRecord,
  type ReportReason,
  type ReportTargetType,
  updateReportReviewStatus,
} from "../../../src/features/reports";

const TARGET_TYPE_FILTERS: Array<ReportTargetType> = ["post", "profile", "link"];

function formatReviewStatus(status: string) {
  if (status === "resolved") {
    return "Resolved";
  }
  if (status === "reviewed") {
    return "Reviewed";
  }
  return "Open";
}

export default function ReportsReviewScreen() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reasonFilter, setReasonFilter] = useState<ReportReason | null>(null);
  const [reports, setReports] = useState<ModerationReportRecord[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [targetTypeFilter, setTargetTypeFilter] = useState<ReportTargetType | null>(null);
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);

  const loadReports = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const result = await fetchReportsForReview({
        reason: reasonFilter,
        targetType: targetTypeFilter,
      });

      if (result.error) {
        setStatusMessage(result.error);
        if (__DEV__) {
          console.error("Failed to load reports for review", result.error);
        }
      } else {
        setReports(result.data);
        setStatusMessage(
          result.data.length > 0 ? `Loaded ${result.data.length} reports.` : "No reports found."
        );
      }

      setIsLoading(false);
      setIsRefreshing(false);
    },
    [reasonFilter, targetTypeFilter]
  );

  useFocusEffect(
    useCallback(() => {
      void loadReports(false);
    }, [loadReports])
  );

  const handleUpdateStatus = async (
    reportId: string,
    nextStatus: "reviewed" | "resolved"
  ) => {
    setUpdatingReportId(reportId);
    setStatusMessage(null);

    const result = await updateReportReviewStatus(reportId, nextStatus);
    if (result.error) {
      setStatusMessage(result.error);
      if (__DEV__) {
        console.error("Failed to update report review status", result.error);
      }
      setUpdatingReportId(null);
      return;
    }

    setReports((current) =>
      current.map((report) =>
        report.id === reportId
          ? {
              ...report,
              review_status: nextStatus,
              reviewed_at: new Date().toISOString(),
              reviewed_by: user?.id ?? report.reviewed_by,
            }
          : report
      )
    );
    setStatusMessage(`Report marked ${nextStatus}.`);
    setUpdatingReportId(null);
  };

  if (!user || !isModerationAdminUser(user.id)) {
    return <Redirect href="/(app)/account" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.heading}>Reports Review</Text>
        <Text style={styles.copy}>
          This moderation screen is limited to allowlisted admin user ids. Use it to review
          the latest reports, then follow the moderation runbook for any manual content or
          account actions.
        </Text>
      </View>

      <View style={styles.filterCard}>
        <Text style={styles.filterLabel}>Reason</Text>
        <View style={styles.filterWrap}>
          <Pressable
            onPress={() => setReasonFilter(null)}
            style={[styles.filterChip, !reasonFilter ? styles.filterChipActive : undefined]}
          >
            <Text
              style={[styles.filterText, !reasonFilter ? styles.filterTextActive : undefined]}
            >
              All
            </Text>
          </Pressable>
          {REPORT_REASONS.map((reason) => (
            <Pressable
              key={reason}
              onPress={() => setReasonFilter(reason)}
              style={[
                styles.filterChip,
                reasonFilter === reason ? styles.filterChipActive : undefined,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  reasonFilter === reason ? styles.filterTextActive : undefined,
                ]}
              >
                {reason}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.filterLabel}>Target type</Text>
        <View style={styles.filterWrap}>
          <Pressable
            onPress={() => setTargetTypeFilter(null)}
            style={[styles.filterChip, !targetTypeFilter ? styles.filterChipActive : undefined]}
          >
            <Text
              style={[
                styles.filterText,
                !targetTypeFilter ? styles.filterTextActive : undefined,
              ]}
            >
              All
            </Text>
          </Pressable>
          {TARGET_TYPE_FILTERS.map((targetType) => (
            <Pressable
              key={targetType}
              onPress={() => setTargetTypeFilter(targetType)}
              style={[
                styles.filterChip,
                targetTypeFilter === targetType ? styles.filterChipActive : undefined,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  targetTypeFilter === targetType ? styles.filterTextActive : undefined,
                ]}
              >
                {targetType}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => void loadReports(true)} style={styles.refreshButton}>
          <Text style={styles.refreshText}>
            {isRefreshing ? "Refreshing..." : "Refresh reports"}
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color={theme.color.accentBright} />
          <Text style={styles.stateText}>Loading reports…</Text>
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateText}>No reports match the current filters.</Text>
        </View>
      ) : (
        reports.map((report) => {
          const isUpdating = updatingReportId === report.id;
          return (
            <View key={report.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <Text style={styles.reportReason}>{report.reason}</Text>
                <Text style={styles.reportStatus}>
                  {formatReviewStatus(report.review_status)}
                </Text>
              </View>

              <Text style={styles.reportMeta}>
                {report.target_type} · target {report.target_id}
              </Text>
              <Text style={styles.reportMeta}>
                reporter @{report.reporter_username ?? report.reporter_id.slice(0, 8)}
              </Text>
              <Text style={styles.reportMeta}>
                created {new Date(report.created_at).toLocaleString()}
              </Text>
              {report.reviewed_at ? (
                <Text style={styles.reportMeta}>
                  last reviewed {new Date(report.reviewed_at).toLocaleString()}
                </Text>
              ) : null}
              {report.details ? (
                <Text style={styles.reportDetails}>{report.details}</Text>
              ) : (
                <Text style={styles.reportDetailsMuted}>No extra details provided.</Text>
              )}

              <View style={styles.actionsRow}>
                <Pressable
                  disabled={isUpdating || report.review_status === "reviewed"}
                  onPress={() => void handleUpdateStatus(report.id, "reviewed")}
                  style={[
                    styles.actionButton,
                    isUpdating || report.review_status === "reviewed"
                      ? styles.actionButtonDisabled
                      : undefined,
                  ]}
                >
                  <Text style={styles.actionButtonText}>
                    {isUpdating ? "Saving..." : "Mark reviewed"}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={isUpdating || report.review_status === "resolved"}
                  onPress={() => void handleUpdateStatus(report.id, "resolved")}
                  style={[
                    styles.actionButton,
                    styles.actionButtonGhost,
                    isUpdating || report.review_status === "resolved"
                      ? styles.actionButtonDisabled
                      : undefined,
                  ]}
                >
                  <Text style={[styles.actionButtonText, styles.actionButtonTextGhost]}>
                    Mark resolved
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}

      {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    backgroundColor: theme.color.accentBright,
    borderRadius: theme.radius.pill,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 14,
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
  actionButtonGhost: {
    backgroundColor: "rgba(255,249,243,0.96)",
    borderColor: theme.color.border,
    borderWidth: 1,
  },
  actionButtonText: {
    color: theme.color.white,
    fontSize: 13,
    fontWeight: "700",
  },
  actionButtonTextGhost: {
    color: theme.color.ink,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  container: {
    backgroundColor: theme.color.shell,
    flexGrow: 1,
    padding: 18,
    paddingBottom: 120,
  },
  copy: {
    color: theme.color.inkSoft,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  filterCard: {
    backgroundColor: "rgba(255,249,243,0.92)",
    borderColor: theme.color.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  filterChip: {
    backgroundColor: "rgba(255,250,246,0.95)",
    borderColor: theme.color.border,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    marginBottom: 8,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterChipActive: {
    backgroundColor: theme.color.accentBright,
    borderColor: theme.color.accentBright,
  },
  filterLabel: {
    color: theme.color.inkSoft,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 6,
  },
  filterText: {
    color: theme.color.ink,
    fontSize: 12,
    fontWeight: "600",
  },
  filterTextActive: {
    color: theme.color.white,
  },
  filterWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  headerCard: {
    backgroundColor: "rgba(232,221,208,0.86)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  heading: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 28,
    fontWeight: "700",
  },
  refreshButton: {
    alignItems: "center",
    backgroundColor: theme.color.ink,
    borderRadius: theme.radius.pill,
    marginTop: 10,
    paddingVertical: 11,
  },
  refreshText: {
    color: theme.color.white,
    fontSize: 13,
    fontWeight: "700",
  },
  reportCard: {
    backgroundColor: "rgba(255,249,243,0.92)",
    borderColor: theme.color.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  reportDetails: {
    color: theme.color.ink,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  reportDetailsMuted: {
    color: theme.color.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  reportHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  reportMeta: {
    color: theme.color.inkSoft,
    fontSize: 12,
    marginTop: 6,
  },
  reportReason: {
    color: theme.color.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    marginRight: 12,
  },
  reportStatus: {
    color: theme.color.accentBright,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  stateCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,243,0.92)",
    borderColor: theme.color.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginTop: 16,
    padding: 24,
  },
  stateText: {
    color: theme.color.inkSoft,
    marginTop: 10,
    textAlign: "center",
  },
  status: {
    color: theme.color.inkSoft,
    marginTop: 16,
    textAlign: "center",
  },
});
