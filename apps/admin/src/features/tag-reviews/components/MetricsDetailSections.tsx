import { Badge } from "@outfiqe/design-system";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import type { TagReviewMetrics } from "../api/tagReviewsSchemas";
import { METRIC_TAG_VIEW } from "../constants/metricTagViews.constants";
import {
  BRAND_DECISION_TARGET_HOURS,
  MIN_SAMPLE_TO_JUDGE,
  POLICY_LABEL,
  REASON_LABEL,
  TIME_TO_GO_LIVE_TARGET_HOURS,
} from "../constants/tagReviewMetrics.constants";
import {
  formatDuration,
  judgeSpeed,
  pluralize,
  SPEED_VERDICT,
  type SpeedVerdict,
} from "../utils/tagReviewMetrics.utils";
import { Card, EmptyState, MetricLinkRow, MetricRow } from "./MetricsCardParts";

const NO_REJECTIONS = 0;

const VERDICT_DISPLAY: Record<
  SpeedVerdict,
  { label: string; tone: "neutral" | "success" | "negative" }
> = {
  TOO_FEW: { label: "Too few to judge", tone: "neutral" },
  ON_TARGET: { label: "On target", tone: "success" },
  TOO_SLOW: { label: "Too slow", tone: "negative" },
};

const VerdictBadge = ({ verdict }: { verdict: SpeedVerdict }) => {
  const { label, tone } = VERDICT_DISPLAY[verdict];
  return (
    <Badge showDot={false} tone={tone}>
      {label}
    </Badge>
  );
};

const describeSpeed = (
  verdict: SpeedVerdict,
  typicalHours: number | null,
  slowestHours: number | null,
): string =>
  verdict === SPEED_VERDICT.TOO_FEW
    ? `Needs at least ${MIN_SAMPLE_TO_JUDGE} before we can judge the speed.`
    : `Usually ${formatDuration(typicalHours)}. 1 in 10 take over ${formatDuration(slowestHours)}.`;

export const FunnelSpeedSection = ({ metrics }: { metrics: TagReviewMetrics }) => {
  const { reviewLatencyByPolicy, timeToFirstShoppable } = metrics;
  const { looksWithApprovedTag, p50Hours, p90Hours } = timeToFirstShoppable;
  const looksVerdict = judgeSpeed(looksWithApprovedTag, p50Hours, TIME_TO_GO_LIVE_TARGET_HOURS);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card
        title="How fast brands answer"
        description={`From a muse tagging a product to the brand saying yes or no. Target: under ${formatDuration(BRAND_DECISION_TARGET_HOURS)}.`}
      >
        {reviewLatencyByPolicy.length === 0 ? (
          <EmptyState>No brand has answered a tag yet.</EmptyState>
        ) : (
          reviewLatencyByPolicy.map(
            ({ policy, decidedCount, p50Hours: typicalHours, p90Hours }) => {
              const verdict = judgeSpeed(decidedCount, typicalHours, BRAND_DECISION_TARGET_HOURS);
              return (
                <MetricLinkRow
                  key={policy}
                  search={{ view: METRIC_TAG_VIEW.BRAND_DECISIONS, policy }}
                  label={`${POLICY_LABEL[policy]} · ${pluralize(decidedCount, "answer")}`}
                  detail={describeSpeed(verdict, typicalHours, p90Hours)}
                  value={<VerdictBadge verdict={verdict} />}
                />
              );
            },
          )
        )}
      </Card>

      <Card
        title="How fast looks become shoppable"
        description={`From a muse posting a look to its first live tag. All time. Target: under ${formatDuration(TIME_TO_GO_LIVE_TARGET_HOURS)}.`}
      >
        {looksWithApprovedTag === 0 ? (
          <EmptyState>No look has a live tag yet.</EmptyState>
        ) : (
          <MetricLinkRow
            search={{ view: METRIC_TAG_VIEW.FIRST_LIVE }}
            label={`${pluralize(looksWithApprovedTag, "look")} with a live tag`}
            detail={describeSpeed(looksVerdict, p50Hours, p90Hours)}
            value={<VerdictBadge verdict={looksVerdict} />}
          />
        )}
      </Card>
    </div>
  );
};

export const DetailSections = ({ metrics }: { metrics: TagReviewMetrics }) => {
  const { rejectionReasonMix, stuckApprovalRequiredCount, reports } = metrics;
  const totalRejections = rejectionReasonMix.reduce((sum, { count }) => sum + count, NO_REJECTIONS);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card title="Needs attention" description="Right now.">
        {stuckApprovalRequiredCount === 0 ? (
          <MetricRow
            label="Stuck tags"
            detail="Nothing has waited over 7 days under a brand that checks every tag."
            value="0"
          />
        ) : (
          <MetricLinkRow
            search={{ view: METRIC_TAG_VIEW.STUCK }}
            label="Stuck tags"
            detail="Waiting over 7 days under a brand that checks every tag."
            value={stuckApprovalRequiredCount}
          />
        )}
        <Link
          to="/tag-reports"
          className="-mx-2 flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>
            <span className="block font-medium text-foreground">Open tag reports</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {pluralize(reports.last30Days, "report")} in the last 30 days.
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1 font-semibold text-foreground">
            {reports.open}
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
          </span>
        </Link>
      </Card>

      <Card
        title="Why tags were rejected"
        description={`All time · ${pluralize(totalRejections, "tag")}.`}
      >
        {rejectionReasonMix.length === 0 ? (
          <EmptyState>No tags have been rejected yet.</EmptyState>
        ) : (
          rejectionReasonMix.map(({ reason, count }) => (
            <MetricLinkRow
              key={reason}
              search={{ view: METRIC_TAG_VIEW.REJECTED, reason }}
              label={REASON_LABEL[reason]}
              value={count}
            />
          ))
        )}
      </Card>
    </div>
  );
};
