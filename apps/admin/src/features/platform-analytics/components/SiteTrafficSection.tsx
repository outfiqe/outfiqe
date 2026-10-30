import { StatCard } from "@outfiqe/design-system";

import { percent } from "@/features/financial-rollup/constants/financialRollup.constants";

import { platformAnalyticsApi } from "../api/platformAnalyticsApi";
import type { RankedPage } from "../api/platformAnalyticsSchemas";
import type { AnalyticsRange } from "../constants/platformAnalytics.constants";
import { usePlatformAnalyticsInsight } from "../hooks/usePlatformAnalyticsInsight";
import { formatSessionLength, toPageLabel } from "../utils/platformAnalytics.utils";
import { AnalyticsInsightSection } from "./AnalyticsInsightSection";
import { RankedList } from "./RankedList";

const NO_PAGE_VIEWS_MESSAGE = "No page views in this range yet.";

const toRankedRows = (pages: RankedPage[]) =>
  pages.map((page) => ({
    rowKey: page.path,
    label: <span title={page.path}>{toPageLabel(page)}</span>,
    value: page.count,
  }));

export const SiteTrafficSection = ({ range }: { range: AnalyticsRange }) => {
  const trafficQuery = usePlatformAnalyticsInsight(
    "site-traffic",
    platformAnalyticsApi.getSiteTraffic,
    range,
  );

  return (
    <AnalyticsInsightSection
      title="Site traffic"
      description="How much of the site people use, and where their visits start and end."
      insightQuery={trafficQuery}
    >
      {({
        pageViews,
        sessions,
        averageSessionSeconds,
        bounceRate,
        topPages,
        entryPages,
        exitPages,
      }) => (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Page views" value={pageViews.toLocaleString()} />
            <StatCard
              label="Sessions"
              value={sessions.toLocaleString()}
              hint="One visit, from arriving to leaving"
            />
            <StatCard label="Average session" value={formatSessionLength(averageSessionSeconds)} />
            <StatCard
              label="Bounce rate"
              value={percent(bounceRate)}
              hint="Sessions that left without doing anything"
            />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <RankedList
              heading="Top pages"
              emptyMessage={NO_PAGE_VIEWS_MESSAGE}
              rows={toRankedRows(topPages)}
            />
            <RankedList
              heading="Where visits start"
              emptyMessage={NO_PAGE_VIEWS_MESSAGE}
              rows={toRankedRows(entryPages)}
            />
            <RankedList
              heading="Where visits end"
              emptyMessage={NO_PAGE_VIEWS_MESSAGE}
              rows={toRankedRows(exitPages)}
            />
          </div>
        </div>
      )}
    </AnalyticsInsightSection>
  );
};
