import type { TagReviewMetrics } from "../api/tagReviewsSchemas";
import { METRIC_TAG_VIEW, type MetricTagView } from "../constants/metricTagViews.constants";
import {
  BRAND_DECISION_TARGET_HOURS,
  MIN_SAMPLE_TO_JUDGE,
  TIME_TO_GO_LIVE_TARGET_HOURS,
} from "../constants/tagReviewMetrics.constants";
import { formatDuration, judgeSpeed, pluralize, SPEED_VERDICT } from "./tagReviewMetrics.utils";

export type TagReviewInsightAction =
  { kind: "tags"; view: MetricTagView; label: string } | { kind: "reports"; label: string };

export type TagReviewInsight = {
  tone: "negative" | "neutral" | "success";
  headline: string;
  detail: string;
  action?: TagReviewInsightAction;
};

const NO_ISSUES = 0;
const SINGLE_ISSUE = 1;

const buildIssuesInsight = ({
  stuckApprovalRequiredCount: stuckCount,
  reports: { open: openReportCount },
}: TagReviewMetrics): TagReviewInsight | null => {
  const issueCount = stuckCount + openReportCount;
  if (issueCount === NO_ISSUES) return null;

  const issueDescriptions = [
    stuckCount > NO_ISSUES && `${pluralize(stuckCount, "tag")} stuck for over 7 days`,
    openReportCount > NO_ISSUES && `${pluralize(openReportCount, "open tag report")}`,
  ].filter(Boolean);

  return {
    tone: "negative",
    headline: `${pluralize(issueCount, "issue")} ${
      issueCount === SINGLE_ISSUE ? "needs" : "need"
    } attention`,
    detail: `${issueDescriptions.join(" and ")}.`,
    action:
      stuckCount > NO_ISSUES
        ? { kind: "tags", view: METRIC_TAG_VIEW.STUCK, label: "See the stuck tags" }
        : { kind: "reports", label: "Open tag reports" },
  };
};

const buildSlowLooksInsight = ({
  timeToFirstShoppable: { looksWithApprovedTag, p50Hours },
}: TagReviewMetrics): TagReviewInsight | null => {
  const verdict = judgeSpeed(looksWithApprovedTag, p50Hours, TIME_TO_GO_LIVE_TARGET_HOURS);
  if (verdict !== SPEED_VERDICT.TOO_SLOW) return null;

  return {
    tone: "negative",
    headline: "Looks are taking too long to become shoppable",
    detail: `A typical look waits ${formatDuration(p50Hours)} for its first live tag. The target is under ${formatDuration(TIME_TO_GO_LIVE_TARGET_HOURS)}.`,
    action: { kind: "tags", view: METRIC_TAG_VIEW.FIRST_LIVE, label: "See the slowest looks" },
  };
};

const buildSlowBrandsInsight = ({
  reviewLatencyByPolicy,
}: TagReviewMetrics): TagReviewInsight | null => {
  const reviewEveryTag = reviewLatencyByPolicy.find(({ policy }) => policy === "APPROVAL_REQUIRED");
  if (!reviewEveryTag) return null;

  const { decidedCount, p50Hours } = reviewEveryTag;
  const verdict = judgeSpeed(decidedCount, p50Hours, BRAND_DECISION_TARGET_HOURS);
  if (verdict !== SPEED_VERDICT.TOO_SLOW) return null;

  return {
    tone: "negative",
    headline: "Brands are taking too long to answer",
    detail: `A typical answer takes ${formatDuration(p50Hours)}. The target is under ${formatDuration(BRAND_DECISION_TARGET_HOURS)}.`,
    action: {
      kind: "tags",
      view: METRIC_TAG_VIEW.BRAND_DECISIONS,
      label: "See the slowest answers",
    },
  };
};

const buildTooEarlyInsight = ({
  timeToFirstShoppable: { looksWithApprovedTag },
}: TagReviewMetrics): TagReviewInsight | null => {
  if (looksWithApprovedTag >= MIN_SAMPLE_TO_JUDGE) return null;

  return {
    tone: "neutral",
    headline: "Too early to judge speed",
    detail: `Only ${pluralize(looksWithApprovedTag, "look has", "looks have")} a live tag so far. Speed checks start at ${MIN_SAMPLE_TO_JUDGE} looks.`,
  };
};

const buildNoBrandChecksInsight = ({
  approvalSourceMix,
}: TagReviewMetrics): TagReviewInsight | null => {
  if (approvalSourceMix.some(({ source }) => source === "BRAND")) return null;

  return {
    tone: "neutral",
    headline: "No brand has checked a tag by hand yet",
    detail: "Every live tag went live automatically or is from before reviews started.",
  };
};

const ALL_CLEAR_INSIGHT: TagReviewInsight = {
  tone: "success",
  headline: "Everything looks good",
  detail: "Nothing is stuck, no reports are open, and looks are going live within the target.",
};

export const buildTagReviewInsight = (metrics: TagReviewMetrics): TagReviewInsight =>
  buildIssuesInsight(metrics) ??
  buildSlowLooksInsight(metrics) ??
  buildSlowBrandsInsight(metrics) ??
  buildTooEarlyInsight(metrics) ??
  buildNoBrandChecksInsight(metrics) ??
  ALL_CLEAR_INSIGHT;
