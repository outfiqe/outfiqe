import { platformAnalyticsApi } from "../api/platformAnalyticsApi";
import type { AnalyticsRange } from "../constants/platformAnalytics.constants";
import { usePlatformAnalyticsInsight } from "../hooks/usePlatformAnalyticsInsight";
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
      title="Searches with no results"
      description="What shoppers looked for and didn't find: ideas for brands to stock."
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
          }))}
        />
      )}
    </AnalyticsInsightSection>
  );
};
