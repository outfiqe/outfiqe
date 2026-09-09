import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { tagReviewsApi } from "./api";
import type { TagReviewMetrics } from "./schemas";

const POLICY_LABEL: Record<TagReviewMetrics["reviewLatencyByPolicy"][number]["policy"], string> = {
  OPEN: "Open to all",
  TRUSTED_ONLY: "Trusted only",
  APPROVAL_REQUIRED: "Review every tag",
};

const SOURCE_LABEL: Record<TagReviewMetrics["approvalSourceMix"][number]["source"], string> = {
  BRAND: "Brand approved",
  POLICY_OPEN: "Auto — open policy",
  TRUSTED_CREATOR: "Auto — trusted creator",
  VERIFIED_BUYER: "Auto — verified buyer",
  SLA: "Auto — SLA lapsed",
  GRANDFATHERED: "Grandfathered",
};

const REASON_LABEL: Record<TagReviewMetrics["rejectionReasonMix"][number]["reason"], string> = {
  NOT_OUR_PRODUCT: "Not our product",
  COUNTERFEIT_SUSPECTED: "Counterfeit suspected",
  MISREPRESENTS_PRODUCT: "Misrepresents product",
  POLICY_VIOLATION: "Policy violation",
  OTHER: "Other",
};

const formatHours = (hours: number | null): string => {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${hours}h`;
  return `${Math.round((hours / 24) * 10) / 10}d`;
};

const Card = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="rounded-xl border border-border bg-card p-5">
    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
    <div className="mt-3">{children}</div>
  </div>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-3 border-b border-border/60 py-2 text-sm last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-foreground">{value}</span>
  </div>
);

export const TagReviewMetricsPage = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tag-review-metrics"],
    queryFn: tagReviewsApi.metrics,
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (error || !data) {
    return <p className="text-sm text-destructive">Couldn&apos;t load tag review metrics.</p>;
  }

  const totalApprovals = data.approvalSourceMix.reduce((sum, row) => sum + row.count, 0);
  const totalRejections = data.rejectionReasonMix.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Tag reviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          How the Brand Tag Review funnel is running across every brand. All-time unless noted.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Brand review latency (submit → decision)">
          {data.reviewLatencyByPolicy.length === 0 ? (
            <p className="text-sm text-muted-foreground">No brand decisions yet.</p>
          ) : (
            data.reviewLatencyByPolicy.map((row) => (
              <Row
                key={row.policy}
                label={`${POLICY_LABEL[row.policy]} (${row.decidedCount})`}
                value={`p50 ${formatHours(row.p50Hours)} · p90 ${formatHours(row.p90Hours)}`}
              />
            ))
          )}
        </Card>

        <Card title="Time to first shoppable tag (post → live)">
          <Row
            label={`Looks with an approved tag (${data.timeToFirstShoppable.looksWithApprovedTag})`}
            value={`p50 ${formatHours(data.timeToFirstShoppable.p50Hours)} · p90 ${formatHours(
              data.timeToFirstShoppable.p90Hours,
            )}`}
          />
        </Card>

        <Card title={`Approval source mix (${totalApprovals})`}>
          {data.approvalSourceMix.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approvals yet.</p>
          ) : (
            data.approvalSourceMix.map((row) => (
              <Row
                key={row.source}
                label={SOURCE_LABEL[row.source]}
                value={`${row.count} · ${Math.round((row.count / totalApprovals) * 100)}%`}
              />
            ))
          )}
        </Card>

        <Card title={`Rejection reasons (${totalRejections})`}>
          {data.rejectionReasonMix.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rejections yet.</p>
          ) : (
            data.rejectionReasonMix.map((row) => (
              <Row key={row.reason} label={REASON_LABEL[row.reason]} value={String(row.count)} />
            ))
          )}
        </Card>

        <Card title="Watch list">
          <Row
            label="Stuck > 7d under Review-every-tag"
            value={String(data.stuckApprovalRequiredCount)}
          />
          <Row label="Open tag reports" value={String(data.reports.open)} />
          <Row label="Tag reports in the last 30 days" value={String(data.reports.last30Days)} />
        </Card>
      </div>
    </div>
  );
};
