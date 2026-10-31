import { CLICKABLE_STAT_CARD_CLASS_NAME, StatCard, StatCardSkeleton } from "@outfiqe/design-system";

import { StatCardFooterLink } from "@/components/MetricParts";
import { money, percent } from "@/features/financial-rollup/constants/financialRollup.constants";

import { platformAnalyticsApi } from "../api/platformAnalyticsApi";
import { METRIC_HINT, SECTION_DESCRIPTION } from "../constants/analyticsCopy.constants";
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
        className={CLICKABLE_STAT_CARD_CLASS_NAME}
        value={sumValues(paymentBreakdowns.map(({ orderCount }) => orderCount)).toLocaleString()}
        hint={METRIC_HINT.ORDERS}
        footer={<StatCardFooterLink to="/orders" period="See orders" />}
      />
      <StatCard
        label="Order value, last 30 days"
        className={CLICKABLE_STAT_CARD_CLASS_NAME}
        value={money(sumValues(paymentBreakdowns.map(({ gmv }) => gmv)))}
        hint={METRIC_HINT.ORDER_VALUE}
        footer={
          <StatCardFooterLink
            to="/financial-rollup"
            search={{ range: "30d" }}
            period="See the money"
          />
        }
      />
      <StatCard
        label="Items credited to muses"
        className={CLICKABLE_STAT_CARD_CLASS_NAME}
        value={percent(rollup.attribution.attributedShare)}
        hint={METRIC_HINT.MUSE_ITEMS}
        footer={
          <StatCardFooterLink
            to="/financial-rollup/ledger"
            search={{ range: "30d", focus: "MUSE_CREDITED" }}
            period="See the items"
          />
        }
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
      sectionId="analytics-overview"
      title="Overview"
      description={SECTION_DESCRIPTION.OVERVIEW}
      insightQuery={overviewQuery}
    >
      {({ visitors, signups, buyers, visitToBuyerRate }) => (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Visitors"
              value={visitors.toLocaleString()}
              hint={METRIC_HINT.VISITORS}
            />
            <StatCard
              label="Sign-ups"
              value={signups.toLocaleString()}
              hint={METRIC_HINT.SIGN_UPS}
            />
            <StatCard label="Buyers" value={buyers.toLocaleString()} hint={METRIC_HINT.BUYERS} />
            <StatCard
              label="Visitors who bought"
              value={percent(visitToBuyerRate)}
              hint={METRIC_HINT.VISITORS_WHO_BOUGHT}
            />
          </div>
          <ExactOrderTotals />
        </div>
      )}
    </AnalyticsInsightSection>
  );
};
