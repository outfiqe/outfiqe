import { PUBLIC_BUILD_SORT, type PublicBuildSort } from "@outfiqe/utils";

import type { PublicBuildFilters } from "../api/outfitSocialSchemas";

export const PRICE_RANGE = {
  ANY: "any",
  UNDER_5K: "under-5k",
  FROM_5K_TO_10K: "5k-10k",
  OVER_10K: "over-10k",
} as const;

export type PriceRange = (typeof PRICE_RANGE)[keyof typeof PRICE_RANGE];

type PriceBounds = Pick<PublicBuildFilters, "minPrice" | "maxPrice">;

const FIVE_THOUSAND = 5_000;
const TEN_THOUSAND = 10_000;
const BELOW_BOUNDARY_STEP = 1;

export const PRICE_RANGE_BOUNDS: Record<PriceRange, PriceBounds> = {
  [PRICE_RANGE.ANY]: { minPrice: undefined, maxPrice: undefined },
  [PRICE_RANGE.UNDER_5K]: { minPrice: undefined, maxPrice: FIVE_THOUSAND - BELOW_BOUNDARY_STEP },
  [PRICE_RANGE.FROM_5K_TO_10K]: {
    minPrice: FIVE_THOUSAND,
    maxPrice: TEN_THOUSAND - BELOW_BOUNDARY_STEP,
  },
  [PRICE_RANGE.OVER_10K]: { minPrice: TEN_THOUSAND, maxPrice: undefined },
};

export const PRICE_RANGE_ORDER: PriceRange[] = [
  PRICE_RANGE.ANY,
  PRICE_RANGE.UNDER_5K,
  PRICE_RANGE.FROM_5K_TO_10K,
  PRICE_RANGE.OVER_10K,
];

export const PUBLIC_BUILD_SORT_ORDER: PublicBuildSort[] = [
  PUBLIC_BUILD_SORT.NEWEST,
  PUBLIC_BUILD_SORT.MOST_CHERIQED,
  PUBLIC_BUILD_SORT.PRICE_LOW,
  PUBLIC_BUILD_SORT.PRICE_HIGH,
];

export const PUBLIC_BUILD_FILTER_PARAM = {
  STYLE: "style",
  PRICE: "price",
  IN_STOCK: "inStock",
  SORT: "sort",
} as const;

const IN_STOCK_PARAM_VALUE = "true";

export const findSelectedPriceRange = ({ minPrice, maxPrice }: PriceBounds): PriceRange | null =>
  PRICE_RANGE_ORDER.find(
    (priceRange) =>
      PRICE_RANGE_BOUNDS[priceRange].minPrice === minPrice &&
      PRICE_RANGE_BOUNDS[priceRange].maxPrice === maxPrice,
  ) ?? null;

export const findPublicBuildSort = (value: string | null): PublicBuildSort | undefined =>
  PUBLIC_BUILD_SORT_ORDER.find((sort) => sort === value);

const findPriceRange = (value: string | null): PriceRange | undefined =>
  PRICE_RANGE_ORDER.find((priceRange) => priceRange === value);

export const hasNarrowingFilters = ({
  category,
  minPrice,
  maxPrice,
  isInStockOnly,
}: PublicBuildFilters): boolean =>
  category !== undefined ||
  minPrice !== undefined ||
  maxPrice !== undefined ||
  isInStockOnly === true;

export const clearNarrowingFilters = ({ sort }: PublicBuildFilters): PublicBuildFilters => ({
  sort,
});

export const readPublicBuildFilters = (
  searchParams: Pick<URLSearchParams, "get">,
): PublicBuildFilters => {
  const priceRange = findPriceRange(searchParams.get(PUBLIC_BUILD_FILTER_PARAM.PRICE));
  return {
    category: searchParams.get(PUBLIC_BUILD_FILTER_PARAM.STYLE) || undefined,
    ...(priceRange ? PRICE_RANGE_BOUNDS[priceRange] : {}),
    isInStockOnly:
      searchParams.get(PUBLIC_BUILD_FILTER_PARAM.IN_STOCK) === IN_STOCK_PARAM_VALUE || undefined,
    sort: findPublicBuildSort(searchParams.get(PUBLIC_BUILD_FILTER_PARAM.SORT)),
  };
};

export const writePublicBuildFilters = (
  params: URLSearchParams,
  { category, minPrice, maxPrice, isInStockOnly, sort }: PublicBuildFilters,
) => {
  const priceRange = findSelectedPriceRange({ minPrice, maxPrice });
  const paramValues: Record<string, string | undefined> = {
    [PUBLIC_BUILD_FILTER_PARAM.STYLE]: category,
    [PUBLIC_BUILD_FILTER_PARAM.PRICE]:
      priceRange === null || priceRange === PRICE_RANGE.ANY ? undefined : priceRange,
    [PUBLIC_BUILD_FILTER_PARAM.IN_STOCK]: isInStockOnly ? IN_STOCK_PARAM_VALUE : undefined,
    [PUBLIC_BUILD_FILTER_PARAM.SORT]: sort === PUBLIC_BUILD_SORT.NEWEST ? undefined : sort,
  };
  Object.keys(paramValues).forEach((paramName) => params.delete(paramName));
  Object.entries(paramValues).forEach(([paramName, paramValue]) => {
    if (paramValue !== undefined) params.set(paramName, paramValue);
  });
};
