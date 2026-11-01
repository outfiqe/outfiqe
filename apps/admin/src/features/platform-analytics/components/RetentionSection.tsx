import { StatCard } from "@outfiqe/design-system";
import { TrendChart } from "@outfiqe/design-system/charts";
import { formatShortDate } from "@outfiqe/utils";

import { percent } from "@/features/financial-rollup/constants/financialRollup.constants";

import { platformAnalyticsApi } from "../api/platformAnalyticsApi";
import { METRIC_HINT, SECTION_DESCRIPTION } from "../constants/analyticsCopy.constants";
import type { AnalyticsRange } from "../constants/platformAnalytics.constants";
import { usePlatformAnalyticsInsight } from "../hooks/usePlatformAnalyticsInsight";
import { AnalyticsInsightSection } from "./AnalyticsInsightSection";

const NO_WEEKS = 0;
const WEEKLY_ACTIVE_SERIES = [{ dataKey: "visitors", label: "Visitors" }] as const;

export const RetentionSection = ({ range }: { range: AnalyticsRange }) => {
  const retentionQuery = usePlatformAnalyticsInsight(
    "retention",
    platformAnalyticsApi.getRetention,
    range,
  );

  return (
    <AnalyticsInsightSection
      sectionId="analytics-returning"
      title="Coming back"
      description={SECTION_DESCRIPTION.RETURNING}
      insightQuery={retentionQuery}
    >
      {({ weeklyActiveVisitors, buyers, repeatBuyers, repeatPurchaseRate }) => (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          {weeklyActiveVisitors.length === NO_WEEKS ? (
            <p className="text-sm text-muted-foreground">No visits in the last 8 weeks yet.</p>
          ) : (
            <TrendChart
              data={weeklyActiveVisitors}
              xKey="weekStart"
              series={WEEKLY_ACTIVE_SERIES}
              variant="area"
              formatXTick={(weekStart) => formatShortDate(String(weekStart))}
              formatTooltipLabel={(weekStart) => `Week of ${formatShortDate(String(weekStart))}`}
            />
          )}
          <div className="grid gap-3">
            <StatCard
              label="Buyers in this period"
              value={buyers.toLocaleString()}
              hint={METRIC_HINT.BUYERS_IN_RANGE}
            />
            <StatCard
              label="Returning buyers"
              value={percent(repeatPurchaseRate)}
              delta={{ value: `${repeatBuyers.toLocaleString()} had ordered before` }}
              hint={METRIC_HINT.RETURNING_BUYERS}
            />
          </div>
        </div>
      )}
    </AnalyticsInsightSection>
  );
};
