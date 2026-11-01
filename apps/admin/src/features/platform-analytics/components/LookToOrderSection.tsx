import { StatCard } from "@outfiqe/design-system";

import { platformAnalyticsApi } from "../api/platformAnalyticsApi";
import { METRIC_HINT, SECTION_DESCRIPTION } from "../constants/analyticsCopy.constants";
import { type AnalyticsRange, DELETED_MUSE_LABEL } from "../constants/platformAnalytics.constants";
import { usePlatformAnalyticsInsight } from "../hooks/usePlatformAnalyticsInsight";
import { toSiteUrl } from "../utils/platformAnalytics.utils";
import { AnalyticsInsightSection } from "./AnalyticsInsightSection";
import { FunnelSteps } from "./FunnelSteps";
import { RankedList } from "./RankedList";

export const LookToOrderSection = ({ range }: { range: AnalyticsRange }) => {
  const lookToOrderQuery = usePlatformAnalyticsInsight(
    "look-to-order",
    platformAnalyticsApi.getLookToOrder,
    range,
  );

  return (
    <AnalyticsInsightSection
      sectionId="analytics-muses"
      title="Muse looks to orders"
      description={SECTION_DESCRIPTION.MUSES}
      insightQuery={lookToOrderQuery}
    >
      {({ steps, attributedOrders, topCreatorsByLookViews }) => (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <FunnelSteps steps={steps} emptyMessage="Nobody has opened a look in this range yet." />
          <div className="space-y-4">
            <StatCard
              label="Orders credited to a muse"
              value={attributedOrders.toLocaleString()}
              hint={METRIC_HINT.ORDERS_CREDITED}
            />
            <RankedList
              heading="Most-viewed muses"
              emptyMessage="No look views in this range yet."
              rows={topCreatorsByLookViews.map(
                ({ creatorId, creatorName, creatorHandle, lookViews }) => ({
                  rowKey: creatorId,
                  label: creatorName ? (
                    <>
                      {creatorName}
                      {creatorHandle && (
                        <span className="ml-1 text-xs text-muted-foreground">{`@${creatorHandle}`}</span>
                      )}
                    </>
                  ) : (
                    DELETED_MUSE_LABEL
                  ),
                  value: lookViews,
                  href: creatorHandle ? toSiteUrl(`/creator/${creatorHandle}`) : undefined,
                }),
              )}
            />
          </div>
        </div>
      )}
    </AnalyticsInsightSection>
  );
};
