import { StatCard, TrendChart } from "@outfiqe/design-system";

import { percent } from "@/features/financial-rollup/constants/financialRollup.constants";

import { platformAnalyticsApi } from "../api/platformAnalyticsApi";
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
      title="Coming back"
      description="Weekly visitors over the last 8 weeks, and how many buyers in this range had ordered before."
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
            />
          )}
          <div className="grid gap-3">
            <StatCard label="Buyers in this range" value={buyers.toLocaleString()} />
            <StatCard
              label="Returning buyers"
              value={percent(repeatPurchaseRate)}
              hint={`${repeatBuyers.toLocaleString()} had ordered before`}
            />
          </div>
        </div>
      )}
    </AnalyticsInsightSection>
  );
};
