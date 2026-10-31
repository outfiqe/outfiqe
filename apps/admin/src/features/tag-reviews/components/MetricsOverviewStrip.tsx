import { FormBanner, StatCard } from "@outfiqe/design-system";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import type { TagReviewMetrics } from "../api/tagReviewsSchemas";
import { METRIC_TAG_VIEW, type MetricTagView } from "../constants/metricTagViews.constants";
import { buildTagReviewInsight } from "../utils/tagReviewInsight.utils";
import {
  buildTrendDelta,
  formatDuration,
  formatPercent,
  hasEnoughToJudge,
  pluralize,
} from "../utils/tagReviewMetrics.utils";
import { MetricTagsLink } from "./MetricsCardParts";

const CLICKABLE_CARD_CLASS_NAME = "relative transition-colors hover:border-foreground/30";
const CARD_FOOTER_LINK_CLASS_NAME =
  "mt-2 flex cursor-pointer items-center justify-between gap-2 text-xs text-muted-foreground after:absolute after:inset-0 after:rounded-xl after:ring-ring focus-visible:outline-none focus-visible:after:ring-2";
const INSIGHT_ACTION_CLASS_NAME = "ml-1 font-semibold underline underline-offset-2";
const NO_SAMPLES = 0;

const CardFooterLink = ({ view, period }: { view: MetricTagView; period: string }) => (
  <MetricTagsLink search={{ view }} className={CARD_FOOTER_LINK_CLASS_NAME}>
    <span>{period}</span>
    <ChevronRight className="size-4 shrink-0" aria-hidden />
  </MetricTagsLink>
);

export const InsightBanner = ({ metrics }: { metrics: TagReviewMetrics }) => {
  const { tone, headline, detail, action } = buildTagReviewInsight(metrics);

  return (
    <FormBanner tone={tone} className="mb-6">
      <span className="font-semibold">{headline}.</span> {detail}
      {action?.kind === "tags" && (
        <MetricTagsLink search={{ view: action.view }} className={INSIGHT_ACTION_CLASS_NAME}>
          {action.label}
        </MetricTagsLink>
      )}
      {action?.kind === "reports" && (
        <Link to="/tag-reports" className={INSIGHT_ACTION_CLASS_NAME}>
          {action.label}
        </Link>
      )}
    </FormBanner>
  );
};

const describeApprovalsPeriod = (total: number, manual: number): string => {
  if (total === NO_SAMPLES) return "No approvals in the last 7 days";
  if (!hasEnoughToJudge(total)) return "Last 7 days · too few to judge";
  return `Last 7 days · ${manual} of ${pluralize(total, "tag")}`;
};

const describeLooksPeriod = (looks: number): string => {
  if (looks === NO_SAMPLES) return "No looks went live in the last 7 days";
  const lookCount = pluralize(looks, "look");
  return hasEnoughToJudge(looks)
    ? `Last 7 days · ${lookCount}`
    : `Last 7 days · only ${lookCount}, too few to judge`;
};

export const OverviewStrip = ({ metrics }: { metrics: TagReviewMetrics }) => {
  const { overview, waitingCount } = metrics;
  const { tagsLive, manualReviewRatePercent, medianTimeToLiveHours } = overview;
  const { approvedLast7d, looksLiveLast7d } = overview;
  const { total: approvedTotal, manual: approvedManually } = approvedLast7d;
  const hasEnoughApprovals = hasEnoughToJudge(approvedTotal);
  const hasFewApprovals = approvedTotal > NO_SAMPLES && !hasEnoughApprovals;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Live tags"
        className={CLICKABLE_CARD_CLASS_NAME}
        value={tagsLive.value === null ? "—" : tagsLive.value.toLocaleString()}
        delta={buildTrendDelta(tagsLive, "higherIsBetter")}
        hint="Product tags shoppers can use right now. Tags on deleted looks don't count."
        footer={<CardFooterLink view={METRIC_TAG_VIEW.LIVE} period="All time" />}
      />
      <StatCard
        label="Waiting for a brand"
        className={CLICKABLE_CARD_CLASS_NAME}
        value={waitingCount.toLocaleString()}
        hint="Tags a brand hasn't answered yet. Shoppers can't use them until the brand says yes."
        footer={<CardFooterLink view={METRIC_TAG_VIEW.WAITING} period="Right now" />}
      />
      <StatCard
        label="Checked by a brand"
        className={CLICKABLE_CARD_CLASS_NAME}
        value={
          hasFewApprovals
            ? `${approvedManually} of ${approvedTotal}`
            : formatPercent(manualReviewRatePercent.value)
        }
        delta={hasEnoughApprovals ? buildTrendDelta(manualReviewRatePercent, "neutral") : undefined}
        hint="Of the tags approved in the last 7 days, how many a person at the brand checked. The rest went live automatically."
        footer={
          <CardFooterLink
            view={METRIC_TAG_VIEW.APPROVED_THIS_WEEK}
            period={describeApprovalsPeriod(approvedTotal, approvedManually)}
          />
        }
      />
      <StatCard
        label="Typical time to go live"
        className={CLICKABLE_CARD_CLASS_NAME}
        value={formatDuration(medianTimeToLiveHours.value)}
        delta={
          hasEnoughToJudge(looksLiveLast7d)
            ? buildTrendDelta(medianTimeToLiveHours, "lowerIsBetter")
            : undefined
        }
        hint="From a muse posting a look to its first tag going live, for looks that went live in the last 7 days. Half were faster than this, half slower."
        footer={
          <CardFooterLink
            view={METRIC_TAG_VIEW.FIRST_LIVE_THIS_WEEK}
            period={describeLooksPeriod(looksLiveLast7d)}
          />
        }
      />
    </div>
  );
};
