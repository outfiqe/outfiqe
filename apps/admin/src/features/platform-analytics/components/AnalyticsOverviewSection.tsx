import { StatCard, StatCardSkeleton } from "@outfiqe/design-system";

import { money, percent } from "@/features/financial-rollup/constants/financialRollup.constants";

import { platformAnalyticsApi } from "../api/platformAnalyticsApi";
import {
  type AnalyticsRange,
  EXACT_TOTALS_UNAVAILABLE_MESSAGE,
} from "../constants/platformAnalytics.constants";
import { useExactOrderTotals } from "../hooks/useExactOrderTotals";
import { usePlatformAnalyticsInsight } from "../hooks/usePlatformAnalyticsInsight";
import { sumValues } from "../utils/platformAnalytics.utils";
import { AnalyticsInsightSection } from "./AnalyticsInsightSection";

const EXACT_TOTALS_CARD_COUNT = 3;

const ExactOrderTotals = () => {
  const { data: rollup, isLoading, isError } = useExactOrderTotals();

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: EXACT_TOTALS_CARD_COUNT }, (_, cardIndex) => (
          <StatCardSkeleton key={cardIndex} />
        ))}
      </div>
    );
  }
  if (isError || !rollup) {
    return <p className="text-sm text-muted-foreground">{EXACT_TOTALS_UNAVAILABLE_MESSAGE}</p>;
  }

  const paymentBreakdowns = Object.values(rollup.byPaymentMethod);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatCard
        label="Orders, last 30 days"
        value={sumValues(paymentBreakdowns.map(({ orderCount }) => orderCount)).toLocaleString()}
        hint="Exact, from the database"
      />
      <StatCard
        label="GMV, last 30 days"
        value={money(sumValues(paymentBreakdowns.map(({ gmv }) => gmv)))}
        hint="Exact, from the database"
      />
      <StatCard
        label="Items credited to muses"
        value={percent(rollup.attribution.attributedShare)}
        hint="Share of ordered items, last 30 days"
      />
    </div>
  );
};

export const AnalyticsOverviewSection = ({ range }: { range: AnalyticsRange }) => {
  const overviewQuery = usePlatformAnalyticsInsight(
    "overview",
    platformAnalyticsApi.getOverview,
    range,
  );

  return (
    <AnalyticsInsightSection
      title="Overview"
      description="Visitors, sign-ups and buyers, with exact order totals from the database."
      insightQuery={overviewQuery}
    >
      {({ visitors, signups, buyers, visitToBuyerRate }) => (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Visitors" value={visitors.toLocaleString()} />
            <StatCard label="Sign-ups" value={signups.toLocaleString()} />
            <StatCard label="Buyers" value={buyers.toLocaleString()} />
            <StatCard
              label="Visitors who bought"
              value={percent(visitToBuyerRate)}
              hint="Buyers divided by visitors"
            />
          </div>
          <ExactOrderTotals />
        </div>
      )}
    </AnalyticsInsightSection>
  );
};
