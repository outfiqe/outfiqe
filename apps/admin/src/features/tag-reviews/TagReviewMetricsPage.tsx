import {
  BarSeries,
  ChartCard,
  FormBanner,
  Skeleton,
  StatCard,
  type StatCardDelta,
  StatCardSkeleton,
  Tooltip,
} from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import type { ReactNode } from "react";

import { tagReviewsApi } from "./api";
import type { PeriodTrend, TagReviewMetrics } from "./schemas";

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
  GRANDFATHERED: "Legacy approval",
};

const AUTO_SOURCES = ["POLICY_OPEN", "TRUSTED_CREATOR", "VERIFIED_BUYER", "SLA"] as const;

const REASON_LABEL: Record<TagReviewMetrics["rejectionReasonMix"][number]["reason"], string> = {
  NOT_OUR_PRODUCT: "Not our product",
  COUNTERFEIT_SUSPECTED: "Counterfeit suspected",
  MISREPRESENTS_PRODUCT: "Misrepresents product",
  POLICY_VIOLATION: "Policy violation",
  OTHER: "Other",
};

const MEDIAN_TIME_TO_LIVE_TARGET_HOURS = 72;
const BRAND_LATENCY_TARGET_HOURS = 24;
const TREND_WINDOW_LABEL = "vs. prior 7d";

const LEGACY_APPROVAL_HINT =
  "Approved before the tag review system existed — no manual or automatic check was applied.";
const SLA_LAPSED_HINT =
  "The brand didn't act within the 7-day review window, so the tag auto-approved under the platform's SLA instead of waiting on the brand forever.";
const PERCENTILE_HINT =
  "p50 (median) is the typical case — half of decisions were faster, half slower. p90 shows the slow tail: 90% of decisions finished within this time.";
const TRUSTED_CREATOR_HINT =
  "The brand has explicitly marked this creator as trusted, so future tags from them skip the review queue.";

const formatHours = (hours: number | null): string => {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${hours}h`;
  return `${Math.round((hours / 24) * 10) / 10}d`;
};

const formatPercent = (value: number | null): string => (value === null ? "—" : `${value}%`);

type TrendDirection = "higherIsBetter" | "lowerIsBetter" | "neutral";

const buildTrendDelta = (trend: PeriodTrend, direction: TrendDirection): StatCardDelta => {
  if (trend.deltaPercent === null) {
    return { value: "Not enough history yet", tone: "neutral" };
  }
  if (trend.deltaPercent === 0) {
    return { value: "No change", tone: "neutral", label: TREND_WINDOW_LABEL };
  }

  const isIncrease = trend.deltaPercent > 0;
  const arrow = isIncrease ? "↑" : "↓";
  const isGoodChange =
    direction === "neutral" ? null : (direction === "higherIsBetter") === isIncrease;
  const tone: StatCardDelta["tone"] =
    isGoodChange === null ? "neutral" : isGoodChange ? "positive" : "negative";

  return { value: `${arrow} ${Math.abs(trend.deltaPercent)}%`, tone, label: TREND_WINDOW_LABEL };
};

const JargonHint = ({ term, children }: { term: string; children: ReactNode }) => (
  <Tooltip content={children}>
    <button
      type="button"
      aria-label={`What does ${term} mean?`}
      className="inline-flex cursor-help text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Info className="size-3.5" aria-hidden />
    </button>
  </Tooltip>
);

const Card = ({ title, children }: { title: ReactNode; children: ReactNode }) => (
  <div className="rounded-xl border border-border bg-card p-5">
    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
    <div className="mt-3">{children}</div>
  </div>
);

const Row = ({ label, value }: { label: ReactNode; value: string }) => (
  <div className="flex items-center justify-between gap-3 border-b border-border/60 py-2 text-sm last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-foreground">{value}</span>
  </div>
);

const EmptyState = ({ children }: { children: ReactNode }) => (
  <p className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">{children}</p>
);

const InsightBanner = ({ data }: { data: TagReviewMetrics }) => {
  const { openIssues, manualReviewRatePercent, tagsLive } = data.overview;

  if (openIssues.count > 0) {
    return (
      <FormBanner tone="negative">
        <span className="font-semibold">
          {openIssues.count} issue{openIssues.count === 1 ? "" : "s"} need
          {openIssues.count === 1 ? "s" : ""} attention
        </span>{" "}
        — open tag reports and tags stuck past the review SLA.
        {openIssues.newLast7d > 0 &&
          ` ${openIssues.newLast7d} of these are new in the last 7 days.`}
      </FormBanner>
    );
  }

  if (tagsLive.value !== null && tagsLive.value > 0 && manualReviewRatePercent.value === 0) {
    return (
      <FormBanner tone="neutral">
        <span className="font-semibold">0 tags have gone through manual review yet</span> — every
        live tag was approved automatically or is a legacy approval.
      </FormBanner>
    );
  }

  return (
    <FormBanner tone="success">
      <span className="font-semibold">Funnel looks healthy</span> — no open issues, and tags are
      going live at a reasonable pace.
    </FormBanner>
  );
};

const OverviewStrip = ({ data }: { data: TagReviewMetrics }) => {
  const { tagsLive, manualReviewRatePercent, medianTimeToLiveHours, openIssues } = data.overview;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Tags live"
        value={tagsLive.value === null ? "—" : tagsLive.value.toLocaleString()}
        delta={buildTrendDelta(tagsLive, "higherIsBetter")}
        hint="How many creator product tags are currently approved and shoppable on the storefront right now."
      />
      <StatCard
        label="Manual review rate"
        value={formatPercent(manualReviewRatePercent.value)}
        delta={buildTrendDelta(manualReviewRatePercent, "neutral")}
        hint="Of the tags approved in the last 7 days, the share a brand staffer reviewed by hand rather than an automatic rule (open policy, trusted creator, verified buyer, or the SLA sweep)."
      />
      <StatCard
        label="Median time to live"
        value={formatHours(medianTimeToLiveHours.value)}
        delta={buildTrendDelta(medianTimeToLiveHours, "lowerIsBetter")}
        hint={`Typical (median) time from a creator posting a look to that look's first tag going live, for tags that went live in the last 7 days. Target: under ${formatHours(MEDIAN_TIME_TO_LIVE_TARGET_HOURS)}.`}
      />
      <StatCard
        label="Open issues"
        value={openIssues.count.toLocaleString()}
        delta={{
          value: openIssues.newLast7d > 0 ? `+${openIssues.newLast7d} new` : "No new issues",
          tone: openIssues.newLast7d > 0 ? "negative" : "neutral",
          label: TREND_WINDOW_LABEL,
        }}
        hint="Tags stuck pending under a brand's 'review every tag' policy past the 7-day SLA window, plus any currently open tag reports."
      />
    </div>
  );
};

const APPROVAL_MIX_CATEGORY_KEY = "bucket";

const ApprovalSourceMixSection = ({ data }: { data: TagReviewMetrics }) => {
  const totalApprovals = data.approvalSourceMix.reduce((sum, row) => sum + row.count, 0);
  const manualCount = data.approvalSourceMix.find((row) => row.source === "BRAND")?.count ?? 0;
  const legacyCount =
    data.approvalSourceMix.find((row) => row.source === "GRANDFATHERED")?.count ?? 0;
  const autoRows = data.approvalSourceMix.filter((row) =>
    (AUTO_SOURCES as readonly string[]).includes(row.source),
  );
  const autoCount = autoRows.reduce((sum, row) => sum + row.count, 0);

  const chartData = [
    {
      [APPROVAL_MIX_CATEGORY_KEY]: "Approvals",
      manual: manualCount,
      automatic: autoCount,
      legacy: legacyCount,
    },
  ];

  return (
    <div>
      <ChartCard
        title="Approval source mix"
        description="How live tags got approved — manual review, automatic rules, or legacy approval."
        isEmpty={totalApprovals === 0}
        emptyMessage="No approvals yet — this fills in once brands or the auto-approval rules start deciding tags."
        dataTable={
          <table>
            <caption>Approval source breakdown</caption>
            <thead>
              <tr>
                <th scope="col">Source</th>
                <th scope="col">Count</th>
              </tr>
            </thead>
            <tbody>
              {data.approvalSourceMix.map((row) => (
                <tr key={row.source}>
                  <td>{SOURCE_LABEL[row.source]}</td>
                  <td>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      >
        <BarSeries
          data={chartData}
          categoryKey={APPROVAL_MIX_CATEGORY_KEY}
          orientation="bar"
          stacked
          height={120}
          series={[
            { dataKey: "manual", label: "Manual review" },
            { dataKey: "automatic", label: "Automatic" },
            { dataKey: "legacy", label: "Legacy approval" },
          ]}
          showLegend
        />
      </ChartCard>

      {(autoCount > 0 || legacyCount > 0) && (
        <div className="mt-3 rounded-xl border border-border bg-card p-4">
          {autoCount > 0 && (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Automatic breakdown
              </p>
              {autoRows.map((row) => (
                <Row
                  key={row.source}
                  label={
                    row.source === "SLA" ? (
                      <span className="inline-flex items-center gap-1">
                        {SOURCE_LABEL[row.source]}
                        <JargonHint term="SLA lapsed">{SLA_LAPSED_HINT}</JargonHint>
                      </span>
                    ) : (
                      SOURCE_LABEL[row.source]
                    )
                  }
                  value={String(row.count)}
                />
              ))}
            </>
          )}
          {legacyCount > 0 && (
            <Row
              label={
                <span className="inline-flex items-center gap-1">
                  Legacy approval
                  <JargonHint term="Legacy approval">{LEGACY_APPROVAL_HINT}</JargonHint>
                </span>
              }
              value={String(legacyCount)}
            />
          )}
        </div>
      )}
    </div>
  );
};

const FunnelSpeedSection = ({ data }: { data: TagReviewMetrics }) => (
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
        From a creator&apos;s post going up to its first tag going live.
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

const DetailSections = ({ data }: { data: TagReviewMetrics }) => {
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
              <JargonHint term="Trusted creator">{TRUSTED_CREATOR_HINT}</JargonHint>
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

const OVERVIEW_TILE_COUNT = 4;
const DETAIL_CARD_ROW_COUNTS = [2, 2, 3];

const TagReviewMetricsSkeleton = () => (
  <div className="space-y-6" role="status" aria-label="Loading">
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Tag reviews</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        How the Brand Tag Review funnel is running across every brand. All-time unless noted.
      </p>
    </div>
    <Skeleton className="h-14 w-full rounded-lg" />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: OVERVIEW_TILE_COUNT }, (_unused, index) => (
        <StatCardSkeleton key={index} hasDelta />
      ))}
    </div>
    <Skeleton className="h-40 w-full rounded-2xl" />
    <div className="grid gap-4 md:grid-cols-2">
      {DETAIL_CARD_ROW_COUNTS.map((rowCount, cardIndex) => (
        <div key={cardIndex} className="rounded-xl border border-border bg-card p-5">
          {Array.from({ length: rowCount }, (_unused, rowIndex) => (
            <div key={rowIndex} className="flex items-center justify-between gap-3 py-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const TagReviewMetricsPage = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tag-review-metrics"],
    queryFn: tagReviewsApi.metrics,
  });

  if (isLoading) {
    return <TagReviewMetricsSkeleton />;
  }
  if (error || !data) {
    return <p className="text-sm text-destructive">Couldn&apos;t load tag review metrics.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Tag reviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          How the Brand Tag Review funnel is running across every brand. All-time unless noted.
        </p>
      </div>

      <InsightBanner data={data} />
      <OverviewStrip data={data} />
      <ApprovalSourceMixSection data={data} />
      <FunnelSpeedSection data={data} />
      <DetailSections data={data} />
    </div>
  );
};
