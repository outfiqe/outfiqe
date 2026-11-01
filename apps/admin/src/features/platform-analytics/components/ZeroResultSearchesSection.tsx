import { platformAnalyticsApi } from "../api/platformAnalyticsApi";
import { SECTION_DESCRIPTION } from "../constants/analyticsCopy.constants";
import type { AnalyticsRange } from "../constants/platformAnalytics.constants";
import { usePlatformAnalyticsInsight } from "../hooks/usePlatformAnalyticsInsight";
import { toSiteUrl } from "../utils/platformAnalytics.utils";
import { AnalyticsInsightSection } from "./AnalyticsInsightSection";
import { RankedList } from "./RankedList";

export const ZeroResultSearchesSection = ({ range }: { range: AnalyticsRange }) => {
  const searchesQuery = usePlatformAnalyticsInsight(
    "zero-result-searches",
    platformAnalyticsApi.getZeroResultSearches,
    range,
  );

  return (
    <AnalyticsInsightSection
      sectionId="analytics-searches"
      title="Searches with no results"
      description={SECTION_DESCRIPTION.SEARCHES}
      insightQuery={searchesQuery}
    >
      {({ searches }) => (
        <RankedList
          heading="Most searched, nothing found"
          emptyMessage="Every search in this range found something."
          rows={searches.map(({ query, searchCount }) => ({
            rowKey: query,
            label: query,
            value: searchCount,
            href: toSiteUrl(`/search?q=${encodeURIComponent(query)}`),
          }))}
        />
      )}
    </AnalyticsInsightSection>
  );
};
