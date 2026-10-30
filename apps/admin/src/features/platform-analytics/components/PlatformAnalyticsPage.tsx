import { FilterChip } from "@outfiqe/design-system";

import { oneOfFilter, useSearchFilter } from "@/lib/useSearchFilter";

import {
  ANALYTICS_PAGE_DESCRIPTION,
  ANALYTICS_RANGE_LABEL,
  ANALYTICS_RANGES,
  DEFAULT_ANALYTICS_RANGE,
  ESTIMATE_NOTE,
} from "../constants/platformAnalytics.constants";
import { AcquisitionSection } from "./AcquisitionSection";
import { AnalyticsOverviewSection } from "./AnalyticsOverviewSection";
import { LookToOrderSection } from "./LookToOrderSection";
import { PurchaseFunnelSection } from "./PurchaseFunnelSection";
import { RetentionSection } from "./RetentionSection";
import { SiteSpeedSection } from "./SiteSpeedSection";
import { SiteTrafficSection } from "./SiteTrafficSection";
import { ZeroResultSearchesSection } from "./ZeroResultSearchesSection";

const RANGE_FILTER = oneOfFilter(ANALYTICS_RANGES, DEFAULT_ANALYTICS_RANGE);

export const PlatformAnalyticsPage = () => {
  const [range, setRange] = useSearchFilter("range", RANGE_FILTER);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-foreground">Product analytics</h1>
        <p className="text-sm text-muted-foreground">{ANALYTICS_PAGE_DESCRIPTION}</p>
      </header>

      <div role="group" aria-label="Date range" className="flex flex-wrap gap-2">
        {ANALYTICS_RANGES.map((rangeOption) => (
          <FilterChip
            key={rangeOption}
            isSelected={range === rangeOption}
            onClick={() => setRange(rangeOption)}
          >
            {ANALYTICS_RANGE_LABEL[rangeOption]}
          </FilterChip>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">{ESTIMATE_NOTE}</p>

      <AnalyticsOverviewSection range={range} />
      <SiteTrafficSection range={range} />
      <PurchaseFunnelSection range={range} />
      <LookToOrderSection range={range} />
      <AcquisitionSection range={range} />
      <RetentionSection range={range} />
      <SiteSpeedSection range={range} />
      <ZeroResultSearchesSection range={range} />
    </div>
  );
};
