import { platformAnalyticsApi } from "../api/platformAnalyticsApi";
import type { AnalyticsRange } from "../constants/platformAnalytics.constants";
import { usePlatformAnalyticsInsight } from "../hooks/usePlatformAnalyticsInsight";
import { toPaymentMethodLabel } from "../utils/platformAnalytics.utils";
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
      title="Purchase funnel"
      description="How many people reach each step from product page to placed order."
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
            }))}
          />
        </div>
      )}
    </AnalyticsInsightSection>
  );
};
