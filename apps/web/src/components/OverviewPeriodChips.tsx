"use client";

import { FilterChip } from "@outfiqe/design-system";

import { OVERVIEW_PERIOD_OPTIONS, type OverviewPeriodDays } from "@/shared/lib/overviewPeriod";

export const OverviewPeriodChips = ({
  selectedDays,
  onSelect,
}: {
  selectedDays: OverviewPeriodDays;
  onSelect: (days: OverviewPeriodDays) => void;
}) => (
  <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a period">
    {OVERVIEW_PERIOD_OPTIONS.map((days) => (
      <FilterChip key={days} isSelected={days === selectedDays} onClick={() => onSelect(days)}>
        Last {days} days
      </FilterChip>
    ))}
  </div>
);
