import { FormBanner, StatCard } from "@outfiqe/design-system";
import { ChartCard, TrendChart } from "@outfiqe/design-system/charts";
import { formatDateTime, formatShortDate } from "@outfiqe/utils";

import { MetricRow, MetricSection } from "@/components/MetricParts";

import type { TrendDebugSnapshot } from "../api/trendingSchemas";
import {
  countRecentActions,
  describeChange,
  describeFreshnessBoost,
  describeTrendVerdict,
  formatNumber,
  listMissingSignalTips,
  toBaselineComparisonLabel,
} from "../utils/trending.utils";
import { ActivityStat } from "./TrendStatCards";

const WEB_URL = import.meta.env.VITE_WEB_URL ?? "http://localhost:3000";
const NO_ACTIONS = 0;

const SCORE_HINT =
  "Purchases count most, then cart adds, stashes and muse tags, then tag taps. Recent actions count more than older ones.";

const ActivityChart = ({ trendSnapshot }: { trendSnapshot: TrendDebugSnapshot }) => {
  const { dailyActivity } = trendSnapshot;
  const hasActivity = dailyActivity.some(({ totalActions }) => totalActions > NO_ACTIONS);

  return (
    <ChartCard
      title="Shopper activity, last 14 days"
      description="Purchases, cart adds, stashes, muse tags and tag taps per day."
      ariaLabel="Shopper actions on this product per day over the last 14 days"
      isEmpty={!hasActivity}
      emptyMessage="No shopper activity on this product in the last 14 days."
      dataTable={
        <table>
          <caption>Shopper actions per day</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Actions</th>
              <th scope="col">Purchases</th>
            </tr>
          </thead>
          <tbody>
            {dailyActivity.map(({ date, totalActions, purchaseUnits }) => (
              <tr key={date}>
                <td>{date}</td>
                <td>{totalActions}</td>
                <td>{purchaseUnits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <TrendChart
        data={dailyActivity}
        xKey="date"
        variant="area"
        series={[{ dataKey: "totalActions", label: "Shopper actions" }]}
        formatXTick={(value) => formatShortDate(String(value))}
        formatTooltipLabel={(label) => formatShortDate(String(label))}
      />
    </ChartCard>
  );
};

const WhySection = ({ trendSnapshot }: { trendSnapshot: TrendDebugSnapshot }) => {
  const { velocity, baseline, baselineLift, freshnessMultiplier, scoredAt } = trendSnapshot;

  return (
    <MetricSection
      title="Why it is here"
      description={`Worked out on ${formatDateTime(scoredAt)}. Scores refresh every 30 minutes.`}
    >
      <MetricRow
        label="Compared with the 6 hours before"
        detail="Is interest rising or falling?"
        value={describeChange(velocity)}
      />
      <MetricRow
        label={toBaselineComparisonLabel(baseline.source)}
        detail="Is it busier than normal?"
        value={describeChange(baselineLift)}
      />
      <MetricRow
        label="New product boost"
        detail="Products under 3 days old get a small lift."
        value={describeFreshnessBoost(freshnessMultiplier)}
      />
    </MetricSection>
  );
};

const WhatWouldHelp = ({ trendSnapshot }: { trendSnapshot: TrendDebugSnapshot }) => {
  const missingSignalTips = listMissingSignalTips(trendSnapshot.recentActivity);
  if (missingSignalTips.length === NO_ACTIONS) return null;

  return (
    <MetricSection
      title="What would help"
      description="Missing from the last 6 hours, most valuable first."
    >
      <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
        {missingSignalTips.map((missingSignalTip) => (
          <li key={missingSignalTip}>{missingSignalTip}</li>
        ))}
      </ul>
    </MetricSection>
  );
};

export const TrendStory = ({
  trendSnapshot,
  productId,
}: {
  trendSnapshot: TrendDebugSnapshot;
  productId: string;
}) => {
  const { recentActivity, score, rank } = trendSnapshot;
  const { tone, headline, detail } = describeTrendVerdict(trendSnapshot);

  return (
    <div className="mt-4 space-y-6">
      <FormBanner tone={tone} className="mb-6">
        <span className="font-semibold">{headline}.</span> {detail}
      </FormBanner>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Position" value={rank ? `#${rank}` : "Not on the list"} />
        <StatCard label="Trending score" value={formatNumber(score)} hint={SCORE_HINT} />
        <StatCard
          label="Actions, last 6 hours"
          value={countRecentActions(recentActivity).toLocaleString()}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <ActivityStat label="Purchases" value={recentActivity.purchaseUnits} />
        <ActivityStat label="Cart adds" value={recentActivity.cartAdds} />
        <ActivityStat label="Stashes" value={recentActivity.saves} />
        <ActivityStat label="Muse tags" value={recentActivity.creatorTags} />
        <ActivityStat label="Tag taps" value={recentActivity.tagClicks} />
      </div>

      <ActivityChart trendSnapshot={trendSnapshot} />
      <WhySection trendSnapshot={trendSnapshot} />
      <WhatWouldHelp trendSnapshot={trendSnapshot} />

      <a
        href={`${WEB_URL}/product/${productId}`}
        target="_blank"
        rel="noreferrer"
        className="inline-block text-sm font-medium text-foreground underline underline-offset-2"
      >
        Open this product on the site
      </a>
    </div>
  );
};
