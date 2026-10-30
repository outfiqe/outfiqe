import { StatCard } from "@outfiqe/design-system";

import { platformAnalyticsApi } from "../api/platformAnalyticsApi";
import { type AnalyticsRange, SPEED_LIMITS } from "../constants/platformAnalytics.constants";
import { usePlatformAnalyticsInsight } from "../hooks/usePlatformAnalyticsInsight";
import { formatLayoutShift, formatPaintTime, toSpeedDelta } from "../utils/platformAnalytics.utils";
import { AnalyticsInsightSection } from "./AnalyticsInsightSection";

const NO_MEASUREMENTS = 0;

export const SiteSpeedSection = ({ range }: { range: AnalyticsRange }) => {
  const speedQuery = usePlatformAnalyticsInsight(
    "site-speed",
    platformAnalyticsApi.getSiteSpeed,
    range,
  );

  return (
    <AnalyticsInsightSection
      title="Site speed"
      description="How fast pages feel on real visitors' devices. Three in four visits were this fast or faster."
      insightQuery={speedQuery}
    >
      {({
        measurementCount,
        largestContentfulPaintMs,
        interactionToNextPaintMs,
        firstContentfulPaintMs,
        cumulativeLayoutShift,
      }) =>
        measurementCount === NO_MEASUREMENTS ? (
          <p className="text-sm text-muted-foreground">No speed measurements in this range yet.</p>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Main content appears"
                value={formatPaintTime(largestContentfulPaintMs)}
                delta={toSpeedDelta(
                  largestContentfulPaintMs,
                  SPEED_LIMITS.LARGEST_CONTENTFUL_PAINT_MS,
                  "LCP",
                )}
              />
              <StatCard
                label="First content appears"
                value={formatPaintTime(firstContentfulPaintMs)}
                delta={toSpeedDelta(
                  firstContentfulPaintMs,
                  SPEED_LIMITS.FIRST_CONTENTFUL_PAINT_MS,
                  "FCP",
                )}
              />
              <StatCard
                label="Response to a tap"
                value={formatPaintTime(interactionToNextPaintMs)}
                delta={toSpeedDelta(
                  interactionToNextPaintMs,
                  SPEED_LIMITS.INTERACTION_TO_NEXT_PAINT_MS,
                  "INP",
                )}
              />
              <StatCard
                label="Layout jumping"
                value={formatLayoutShift(cumulativeLayoutShift)}
                delta={toSpeedDelta(
                  cumulativeLayoutShift,
                  SPEED_LIMITS.CUMULATIVE_LAYOUT_SHIFT,
                  "CLS",
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {`Based on ${measurementCount.toLocaleString()} measurements.`}
            </p>
          </div>
        )
      }
    </AnalyticsInsightSection>
  );
};
