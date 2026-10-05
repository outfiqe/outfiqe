"use client";

import { Button, FilterChip, Label, Select } from "@outfiqe/design-system";
import { PUBLIC_BUILD_SORT, type PublicBuildSort } from "@outfiqe/utils";
import { useTranslations } from "next-intl";
import { useId } from "react";

import { useCategories } from "@/features/categories/hooks/useCategories";

import type { PublicBuildFilters } from "../api/outfitSocialSchemas";
import {
  clearNarrowingFilters,
  findSelectedPriceRange,
  hasNarrowingFilters,
  PRICE_RANGE,
  PRICE_RANGE_BOUNDS,
  PRICE_RANGE_ORDER,
  type PriceRange,
} from "../utils/publicBuildFilters";

const PRICE_RANGE_MESSAGE_KEY = {
  [PRICE_RANGE.ANY]: "priceRanges.any",
  [PRICE_RANGE.UNDER_5K]: "priceRanges.under5k",
  [PRICE_RANGE.FROM_5K_TO_10K]: "priceRanges.from5kTo10k",
  [PRICE_RANGE.OVER_10K]: "priceRanges.over10k",
} as const satisfies Record<PriceRange, string>;

const SORT_MESSAGE_KEY = {
  [PUBLIC_BUILD_SORT.NEWEST]: "sorts.newest",
  [PUBLIC_BUILD_SORT.MOST_CHERIQED]: "sorts.mostCheriqed",
  [PUBLIC_BUILD_SORT.PRICE_LOW]: "sorts.priceLow",
  [PUBLIC_BUILD_SORT.PRICE_HIGH]: "sorts.priceHigh",
} as const satisfies Record<PublicBuildSort, string>;

const SORT_ORDER: PublicBuildSort[] = [
  PUBLIC_BUILD_SORT.NEWEST,
  PUBLIC_BUILD_SORT.MOST_CHERIQED,
  PUBLIC_BUILD_SORT.PRICE_LOW,
  PUBLIC_BUILD_SORT.PRICE_HIGH,
];

const findSort = (value: string): PublicBuildSort | undefined =>
  SORT_ORDER.find((sort) => sort === value);

export const PublicBuildFiltersBar = ({
  filters,
  onChange,
}: {
  filters: PublicBuildFilters;
  onChange: (filters: PublicBuildFilters) => void;
}) => {
  const t = useTranslations("outfitBuild.public");
  const sortId = useId();
  const { data: categories = [] } = useCategories();
  const { category, isInStockOnly = false, sort = PUBLIC_BUILD_SORT.NEWEST } = filters;
  const selectedPriceRange = findSelectedPriceRange(filters);

  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="sr-only">{t("filtersLabel")}</legend>

      <div
        role="group"
        aria-label={t("category")}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        <FilterChip
          isSelected={category === undefined}
          onClick={() => onChange({ ...filters, category: undefined })}
        >
          {t("allCategories")}
        </FilterChip>
        {categories.map(({ slug, name }) => (
          <FilterChip
            key={slug}
            isSelected={category === slug}
            onClick={() => onChange({ ...filters, category: slug })}
          >
            {name}
          </FilterChip>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label={t("price")} className="flex flex-wrap items-center gap-2">
          {PRICE_RANGE_ORDER.map((priceRange) => (
            <FilterChip
              key={priceRange}
              isSelected={selectedPriceRange === priceRange}
              onClick={() => onChange({ ...filters, ...PRICE_RANGE_BOUNDS[priceRange] })}
            >
              {t(PRICE_RANGE_MESSAGE_KEY[priceRange])}
            </FilterChip>
          ))}
          <FilterChip
            isSelected={isInStockOnly}
            onClick={() => onChange({ ...filters, isInStockOnly: !isInStockOnly })}
          >
            {t("inStockOnly")}
          </FilterChip>
          {hasNarrowingFilters(filters) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(clearNarrowingFilters(filters))}
            >
              {t("clearFilters")}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor={sortId} className="shrink-0 text-xs text-muted-foreground">
            {t("sortLabel")}
          </Label>
          <Select
            id={sortId}
            className="h-9 w-auto"
            value={sort}
            onChange={(event) =>
              onChange({ ...filters, sort: findSort(event.target.value) ?? sort })
            }
          >
            {SORT_ORDER.map((sortOption) => (
              <option key={sortOption} value={sortOption}>
                {t(SORT_MESSAGE_KEY[sortOption])}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </fieldset>
  );
};
