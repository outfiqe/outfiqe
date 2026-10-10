import { FormBanner, StatCard } from "@outfiqe/design-system";

import type { TagReviewMetrics } from "../api/tagReviewsSchemas";
import {
  MEDIAN_TIME_TO_LIVE_TARGET_HOURS,
  TREND_WINDOW_LABEL,
} from "../constants/tagReviewMetrics.constants";
import { buildTrendDelta, formatHours, formatPercent } from "../utils/tagReviewMetrics.utils";

export const InsightBanner = ({ data }: { data: TagReviewMetrics }) => {
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

export const OverviewStrip = ({ data }: { data: TagReviewMetrics }) => {
  const { tagsLive, manualReviewRatePercent, medianTimeToLiveHours, openIssues } = data.overview;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Tags live"
        value={tagsLive.value === null ? "—" : tagsLive.value.toLocaleString()}
        delta={buildTrendDelta(tagsLive, "higherIsBetter")}
        hint="How many muse product tags are currently approved and shoppable on the storefront right now."
      />
      <StatCard
        label="Manual review rate"
        value={formatPercent(manualReviewRatePercent.value)}
        delta={buildTrendDelta(manualReviewRatePercent, "neutral")}
        hint="Of the tags approved in the last 7 days, the share a brand staffer reviewed by hand rather than an automatic rule (open policy, trusted muse, verified buyer, or the SLA sweep)."
      />
      <StatCard
        label="Median time to live"
        value={formatHours(medianTimeToLiveHours.value)}
        delta={buildTrendDelta(medianTimeToLiveHours, "lowerIsBetter")}
        hint={`Typical (median) time from a muse dropping a look to that look's first tag going live, for tags that went live in the last 7 days. Target: under ${formatHours(MEDIAN_TIME_TO_LIVE_TARGET_HOURS)}.`}
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
