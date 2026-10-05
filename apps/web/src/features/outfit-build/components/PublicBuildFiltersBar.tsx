"use client";

import { Button, FilterChip, FilterMenu } from "@outfiqe/design-system";
import { PUBLIC_BUILD_SORT, type PublicBuildSort } from "@outfiqe/utils";
import { useTranslations } from "next-intl";

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
  PUBLIC_BUILD_SORT_ORDER,
} from "../utils/publicBuildFilters";

const ALL_STYLES_VALUE = "all";

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

export const PublicBuildFiltersBar = ({
  filters,
  onChange,
}: {
  filters: PublicBuildFilters;
  onChange: (filters: PublicBuildFilters) => void;
}) => {
  const t = useTranslations("outfitBuild.public");
  const { data: categories = [] } = useCategories();
  const { category, isInStockOnly = false, sort = PUBLIC_BUILD_SORT.NEWEST } = filters;
  const selectedPriceRange = findSelectedPriceRange(filters) ?? PRICE_RANGE.ANY;

  const styleOptions = [
    { value: ALL_STYLES_VALUE, label: t("allCategories") },
    ...categories.map(({ slug, name }) => ({ value: slug, label: name })),
  ];
  const priceOptions = PRICE_RANGE_ORDER.map((priceRange) => ({
    value: priceRange,
    label: t(PRICE_RANGE_MESSAGE_KEY[priceRange]),
  }));
  const sortOptions = PUBLIC_BUILD_SORT_ORDER.map((sortOption) => ({
    value: sortOption,
    label: t(SORT_MESSAGE_KEY[sortOption]),
  }));

  return (
    <div
      role="group"
      aria-label={t("filtersLabel")}
      className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
    >
      <FilterMenu
        label={t("category")}
        options={styleOptions}
        value={category ?? ALL_STYLES_VALUE}
        defaultValue={ALL_STYLES_VALUE}
        onChange={(style) =>
          onChange({ ...filters, category: style === ALL_STYLES_VALUE ? undefined : style })
        }
      />
      <FilterMenu
        label={t("price")}
        options={priceOptions}
        value={selectedPriceRange}
        defaultValue={PRICE_RANGE.ANY}
        onChange={(priceRange) => onChange({ ...filters, ...PRICE_RANGE_BOUNDS[priceRange] })}
      />
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
          className="h-8 shrink-0"
          onClick={() => onChange(clearNarrowingFilters(filters))}
        >
          {t("clearFilters")}
        </Button>
      )}
      <FilterMenu
        label={t("sortLabel")}
        options={sortOptions}
        value={sort}
        defaultValue={PUBLIC_BUILD_SORT.NEWEST}
        onChange={(sortOption) => onChange({ ...filters, sort: sortOption })}
        className="sm:ml-auto"
      />
    </div>
  );
};
