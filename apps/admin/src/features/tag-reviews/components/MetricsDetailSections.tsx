import type { TagReviewMetrics } from "../api/tagReviewsSchemas";
import {
  BRAND_LATENCY_TARGET_HOURS,
  MEDIAN_TIME_TO_LIVE_TARGET_HOURS,
  PERCENTILE_HINT,
  POLICY_LABEL,
  REASON_LABEL,
  TRUSTED_CREATOR_HINT,
} from "../constants/tagReviewMetrics.constants";
import { formatHours } from "../utils/tagReviewMetrics.utils";
import { Card, EmptyState, JargonHint, Row } from "./MetricsCardParts";

export const FunnelSpeedSection = ({ data }: { data: TagReviewMetrics }) => (
  <div className="grid gap-4 md:grid-cols-2">
    <Card
      title={
        <span className="inline-flex items-center gap-1.5">
          Brand review latency
          <JargonHint term="p50/p90">{PERCENTILE_HINT}</JargonHint>
        </span>
      }
    >
      <p className="mb-2 text-xs text-muted-foreground">
        Time from a tag being submitted to a brand deciding on it by hand.
      </p>
      {data.reviewLatencyByPolicy.length === 0 ? (
        <EmptyState>
          No brand decisions yet — expected before any brand has reviewed a tag.
        </EmptyState>
      ) : (
        data.reviewLatencyByPolicy.map((row) => (
          <Row
            key={row.policy}
            label={`${POLICY_LABEL[row.policy]} (${row.decidedCount})`}
            value={
              `p50 ${formatHours(row.p50Hours)} · p90 ${formatHours(row.p90Hours)}` +
              (row.policy === "APPROVAL_REQUIRED"
                ? ` — target: <${formatHours(BRAND_LATENCY_TARGET_HOURS)}`
                : "")
            }
          />
        ))
      )}
    </Card>

    <Card title="Time to first shoppable tag">
      <p className="mb-2 text-xs text-muted-foreground">
        From a muse&apos;s drop going up to its first tag going live.
      </p>
      {data.timeToFirstShoppable.looksWithApprovedTag === 0 ? (
        <EmptyState>No looks with an approved tag yet — expected pre-launch.</EmptyState>
      ) : (
        <Row
          label={`Looks with an approved tag (${data.timeToFirstShoppable.looksWithApprovedTag})`}
          value={`p50 ${formatHours(data.timeToFirstShoppable.p50Hours)} · p90 ${formatHours(
            data.timeToFirstShoppable.p90Hours,
          )} — target: <${formatHours(MEDIAN_TIME_TO_LIVE_TARGET_HOURS)}`}
        />
      )}
    </Card>
  </div>
);

export const DetailSections = ({ data }: { data: TagReviewMetrics }) => {
  const totalRejections = data.rejectionReasonMix.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card title={`Rejection reasons (${totalRejections})`}>
        {data.rejectionReasonMix.length === 0 ? (
          <EmptyState>No rejections yet — expected pre-launch.</EmptyState>
        ) : (
          data.rejectionReasonMix.map((row) => (
            <Row key={row.reason} label={REASON_LABEL[row.reason]} value={String(row.count)} />
          ))
        )}
      </Card>

      <Card title="Watch list">
        <Row
          label={
            <span className="inline-flex items-center gap-1.5">
              Stuck &gt; 7d under Review-every-tag
              <JargonHint term="Trusted muse">{TRUSTED_CREATOR_HINT}</JargonHint>
            </span>
          }
          value={String(data.stuckApprovalRequiredCount)}
        />
        <Row label="Open tag reports" value={String(data.reports.open)} />
        <Row label="Tag reports in the last 30 days" value={String(data.reports.last30Days)} />
      </Card>
    </div>
  );
};
