import { StatCard } from "@outfiqe/design-system";

import { platformAnalyticsApi } from "../api/platformAnalyticsApi";
import { METRIC_HINT, SECTION_DESCRIPTION } from "../constants/analyticsCopy.constants";
import type { AnalyticsRange } from "../constants/platformAnalytics.constants";
import { usePlatformAnalyticsInsight } from "../hooks/usePlatformAnalyticsInsight";
import { toTrafficSourceLabel, toTrafficSourceUrl } from "../utils/platformAnalytics.utils";
import { AnalyticsInsightSection } from "./AnalyticsInsightSection";
import { RankedList } from "./RankedList";

export const AcquisitionSection = ({ range }: { range: AnalyticsRange }) => {
  const acquisitionQuery = usePlatformAnalyticsInsight(
    "acquisition",
    platformAnalyticsApi.getAcquisition,
    range,
  );

  return (
    <AnalyticsInsightSection
      sectionId="analytics-sources"
      title="Where visitors come from"
      description={SECTION_DESCRIPTION.SOURCES}
      insightQuery={acquisitionQuery}
    >
      {({ sources, campaigns, creatorLinkClicks }) => (
        <div className="grid gap-6 lg:grid-cols-3">
          <RankedList
            heading="Top sources"
            emptyMessage="No visits in this range yet."
            rows={sources.map(({ source, visitors }) => ({
              rowKey: source,
              label: toTrafficSourceLabel(source),
              value: visitors,
              href: toTrafficSourceUrl(source),
            }))}
          />
          <RankedList
            heading="Campaigns"
            emptyMessage="No campaign links used in this range."
            rows={campaigns.map(({ campaign, visitors }) => ({
              rowKey: campaign,
              label: campaign,
              value: visitors,
            }))}
          />
          <StatCard
            label="Muse link clicks"
            value={creatorLinkClicks.toLocaleString()}
            hint={METRIC_HINT.MUSE_LINK_CLICKS}
          />
        </div>
      )}
    </AnalyticsInsightSection>
  );
};
