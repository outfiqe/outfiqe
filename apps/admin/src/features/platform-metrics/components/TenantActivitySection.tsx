import { FilterChip } from "@outfiqe/design-system";
import { TrendChart } from "@outfiqe/design-system/charts";
import { formatShortDate } from "@outfiqe/utils";
import { useState } from "react";

import { MetricSection } from "@/components/MetricParts";

import type { TenantSparklinePoint } from "../api/platformMetricsSchemas";
import {
  TENANT_ACTIVITY_MEASURES,
  type TenantActivityMeasure,
} from "../constants/tenantMetrics.constants";

const MIN_TREND_POINTS = 2;
const NO_ACTIVITY = 0;
const DEFAULT_MEASURE: TenantActivityMeasure = "activityCount";

const EmptyMessage = ({ children }: { children: string }) => (
  <p className="text-sm text-muted-foreground">{children}</p>
);

export const TenantActivitySection = ({ points }: { points: TenantSparklinePoint[] }) => {
  const [measure, setMeasure] = useState<TenantActivityMeasure>(DEFAULT_MEASURE);
  const selectedMeasure = TENANT_ACTIVITY_MEASURES.find(({ dataKey }) => dataKey === measure);
  const hasEnoughPoints = points.length >= MIN_TREND_POINTS;
  const hasAnyActivity = points.some((point) => point[measure] > NO_ACTIVITY);

  return (
    <MetricSection title="Last 30 days" description="One reading per day. Pick what to look at.">
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Choose what to chart">
        {TENANT_ACTIVITY_MEASURES.map(({ dataKey, label }) => (
          <FilterChip
            key={dataKey}
            isSelected={dataKey === measure}
            onClick={() => setMeasure(dataKey)}
          >
            {label}
          </FilterChip>
        ))}
      </div>

      {!hasEnoughPoints && <EmptyMessage>Not enough history yet for a trend.</EmptyMessage>}
      {hasEnoughPoints && !hasAnyActivity && (
        <EmptyMessage>Nothing recorded in this window yet.</EmptyMessage>
      )}
      {hasEnoughPoints && hasAnyActivity && selectedMeasure && (
        <div role="img" aria-label={`${selectedMeasure.label} per day over the last 30 days`}>
          <TrendChart
            data={points}
            xKey="day"
            variant="area"
            series={[{ dataKey: selectedMeasure.dataKey, label: selectedMeasure.label }]}
            formatXTick={(value) => formatShortDate(String(value))}
            formatTooltipLabel={(label) => formatShortDate(String(label))}
          />
        </div>
      )}
    </MetricSection>
  );
};
