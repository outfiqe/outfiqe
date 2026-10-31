import { FilterChip, StatCard } from "@outfiqe/design-system";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { platformAnalyticsApi } from "../api/platformAnalyticsApi";
import type { SpeedReading } from "../api/platformAnalyticsSchemas";
import {
  METRIC_HINT,
  SECTION_DESCRIPTION,
  SPEED_DEVICE_LABEL,
  SPEED_DEVICES,
  SPEED_PAGE_LABEL,
  SPEED_PAGES,
  SPEED_PERCENTILE_EXPLANATION,
  SPEED_PERCENTILE_LABEL,
  SPEED_PERCENTILES,
  type SpeedDevice,
  type SpeedPage,
  type SpeedPercentile,
} from "../constants/analyticsCopy.constants";
import {
  type AnalyticsRange,
  PLATFORM_ANALYTICS_QUERY_KEY,
  SPEED_LIMITS,
  type SpeedLimits,
} from "../constants/platformAnalytics.constants";
import {
  formatLayoutShift,
  formatPaintTime,
  toPageLabel,
  toReadingsLabel,
  toSiteUrl,
  toSpeedRatingDelta,
} from "../utils/platformAnalytics.utils";
import { AnalyticsInsightSection } from "./AnalyticsInsightSection";
import { RankedList } from "./RankedList";

const NO_MEASUREMENTS = 0;
const DEFAULT_PERCENTILE: SpeedPercentile = "p75";

const ChipRow = <Choice extends string>({
  label,
  choices,
  labels,
  selected,
  onSelect,
}: {
  label: string;
  choices: readonly Choice[];
  labels: Record<Choice, string>;
  selected: Choice;
  onSelect: (choice: Choice) => void;
}) => (
  <div role="group" aria-label={label} className="flex flex-wrap gap-2">
    {choices.map((choice) => (
      <FilterChip key={choice} isSelected={choice === selected} onClick={() => onSelect(choice)}>
        {labels[choice]}
      </FilterChip>
    ))}
  </div>
);

const SpeedCard = ({
  label,
  hint,
  reading,
  percentile,
  limits,
  format,
}: {
  label: string;
  hint: string;
  reading: SpeedReading;
  percentile: SpeedPercentile;
  limits: SpeedLimits;
  format: (measurement: number | null) => string;
}) => {
  const measurement = reading[percentile];

  return (
    <StatCard
      label={label}
      value={format(measurement)}
      hint={hint}
      delta={toSpeedRatingDelta(measurement, limits, reading.sampleCount)}
      footer={
        <p className="mt-1 text-xs text-muted-foreground">{toReadingsLabel(reading.sampleCount)}</p>
      }
    />
  );
};

export const SiteSpeedSection = ({ range }: { range: AnalyticsRange }) => {
  const [percentile, setPercentile] = useState<SpeedPercentile>(DEFAULT_PERCENTILE);
  const [device, setDevice] = useState<SpeedDevice>("all");
  const [page, setPage] = useState<SpeedPage>("all");

  const speedQuery = useQuery({
    queryKey: [...PLATFORM_ANALYTICS_QUERY_KEY, "site-speed", range, device, page],
    queryFn: () => platformAnalyticsApi.getSiteSpeed(range, { device, page }),
    placeholderData: keepPreviousData,
  });

  return (
    <AnalyticsInsightSection
      sectionId="analytics-speed"
      title="Site speed"
      description={SECTION_DESCRIPTION.SPEED}
      insightQuery={speedQuery}
    >
      {({
        measurementCount,
        largestContentfulPaint,
        firstContentfulPaint,
        interactionToNextPaint,
        cumulativeLayoutShift,
        slowestPages,
      }) => (
        <div className="space-y-4">
          <div className="space-y-2">
            <ChipRow
              label="How slow a visit to show"
              choices={SPEED_PERCENTILES}
              labels={SPEED_PERCENTILE_LABEL}
              selected={percentile}
              onSelect={setPercentile}
            />
            <ChipRow
              label="Device"
              choices={SPEED_DEVICES}
              labels={SPEED_DEVICE_LABEL}
              selected={device}
              onSelect={setDevice}
            />
            <ChipRow
              label="Page"
              choices={SPEED_PAGES}
              labels={SPEED_PAGE_LABEL}
              selected={page}
              onSelect={setPage}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            {SPEED_PERCENTILE_EXPLANATION[percentile]}
          </p>

          {measurementCount === NO_MEASUREMENTS ? (
            <p className="text-sm text-muted-foreground">
              No speed readings for this choice yet. Try a longer period or All pages.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SpeedCard
                  label="Main content appears"
                  hint={METRIC_HINT.MAIN_CONTENT}
                  reading={largestContentfulPaint}
                  percentile={percentile}
                  limits={SPEED_LIMITS.LARGEST_CONTENTFUL_PAINT_MS}
                  format={formatPaintTime}
                />
                <SpeedCard
                  label="First content appears"
                  hint={METRIC_HINT.FIRST_CONTENT}
                  reading={firstContentfulPaint}
                  percentile={percentile}
                  limits={SPEED_LIMITS.FIRST_CONTENTFUL_PAINT_MS}
                  format={formatPaintTime}
                />
                <SpeedCard
                  label="Response to a tap"
                  hint={METRIC_HINT.TAP_RESPONSE}
                  reading={interactionToNextPaint}
                  percentile={percentile}
                  limits={SPEED_LIMITS.INTERACTION_TO_NEXT_PAINT_MS}
                  format={formatPaintTime}
                />
                <SpeedCard
                  label="Layout jumping"
                  hint={METRIC_HINT.LAYOUT_JUMPING}
                  reading={cumulativeLayoutShift}
                  percentile={percentile}
                  limits={SPEED_LIMITS.CUMULATIVE_LAYOUT_SHIFT}
                  format={formatLayoutShift}
                />
              </div>

              <RankedList
                heading="Slowest pages for main content (typical visit)"
                emptyMessage="No page has a main content reading yet."
                rows={slowestPages.map((slowPage) => ({
                  rowKey: slowPage.path,
                  label: toPageLabel(slowPage),
                  value: `${formatPaintTime(slowPage.typicalLoadMs)} · ${toReadingsLabel(slowPage.sampleCount)}`,
                  href: toSiteUrl(slowPage.path),
                }))}
              />
            </>
          )}
        </div>
      )}
    </AnalyticsInsightSection>
  );
};
