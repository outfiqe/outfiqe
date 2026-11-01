import { platformAnalyticsApi } from "../api/platformAnalyticsApi";
import { SECTION_DESCRIPTION } from "../constants/analyticsCopy.constants";
import type { AnalyticsRange } from "../constants/platformAnalytics.constants";
import { usePlatformAnalyticsInsight } from "../hooks/usePlatformAnalyticsInsight";
import { toLedgerMethod, toPaymentMethodLabel } from "../utils/platformAnalytics.utils";
import { AnalyticsInsightSection } from "./AnalyticsInsightSection";
import { FunnelSteps } from "./FunnelSteps";
import { RankedList } from "./RankedList";

export const PurchaseFunnelSection = ({ range }: { range: AnalyticsRange }) => {
  const funnelQuery = usePlatformAnalyticsInsight(
    "purchase-funnel",
    platformAnalyticsApi.getPurchaseFunnel,
    range,
  );

  return (
    <AnalyticsInsightSection
      sectionId="analytics-purchases"
      title="Purchase funnel"
      description={SECTION_DESCRIPTION.PURCHASES}
      insightQuery={funnelQuery}
    >
      {({ steps, ordersByPaymentMethod }) => (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <FunnelSteps steps={steps} emptyMessage="No product views in this range yet." />
          <RankedList
            heading="Orders by payment method"
            emptyMessage="No orders in this range yet."
            rows={ordersByPaymentMethod.map(({ paymentMethod, orders }) => ({
              rowKey: paymentMethod,
              label: toPaymentMethodLabel(paymentMethod),
              value: orders,
              to: "/financial-rollup/ledger",
              search: { method: toLedgerMethod(paymentMethod) },
            }))}
          />
        </div>
      )}
    </AnalyticsInsightSection>
  );
};
