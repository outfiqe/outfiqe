import { StatCard } from "@outfiqe/design-system";

import { percent } from "@/features/financial-rollup/constants/financialRollup.constants";

import { platformAnalyticsApi } from "../api/platformAnalyticsApi";
import type { RankedPage } from "../api/platformAnalyticsSchemas";
import { METRIC_HINT, SECTION_DESCRIPTION } from "../constants/analyticsCopy.constants";
import type { AnalyticsRange } from "../constants/platformAnalytics.constants";
import { usePlatformAnalyticsInsight } from "../hooks/usePlatformAnalyticsInsight";
import { formatSessionLength, toPageLabel, toSiteUrl } from "../utils/platformAnalytics.utils";
import { AnalyticsInsightSection } from "./AnalyticsInsightSection";
import { RankedList } from "./RankedList";

const NO_PAGE_VIEWS_MESSAGE = "No page views in this range yet.";

const toRankedRows = (pages: RankedPage[]) =>
  pages.map((page) => ({
    rowKey: page.path,
    label: toPageLabel(page),
    value: page.count,
    href: toSiteUrl(page.path),
  }));

export const SiteTrafficSection = ({ range }: { range: AnalyticsRange }) => {
  const trafficQuery = usePlatformAnalyticsInsight(
    "site-traffic",
    platformAnalyticsApi.getSiteTraffic,
    range,
  );

  return (
    <AnalyticsInsightSection
      sectionId="analytics-traffic"
      title="Site traffic"
      description={SECTION_DESCRIPTION.TRAFFIC}
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
            <StatCard
              label="Page views"
              value={pageViews.toLocaleString()}
              hint={METRIC_HINT.PAGE_VIEWS}
            />
            <StatCard
              label="Visits"
              value={sessions.toLocaleString()}
              hint={METRIC_HINT.SESSIONS}
            />
            <StatCard
              label="Average visit length"
              value={formatSessionLength(averageSessionSeconds)}
              hint={METRIC_HINT.AVERAGE_SESSION}
            />
            <StatCard
              label="Left straight away"
              value={percent(bounceRate)}
              hint={METRIC_HINT.BOUNCE_RATE}
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
