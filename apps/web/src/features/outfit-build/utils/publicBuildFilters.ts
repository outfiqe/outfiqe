import type { PublicBuildFilters } from "../api/outfitSocialSchemas";

export const PRICE_RANGE = {
  ANY: "any",
  UNDER_5K: "under5k",
  FROM_5K_TO_10K: "from5kTo10k",
  OVER_10K: "over10k",
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

export const findSelectedPriceRange = ({ minPrice, maxPrice }: PriceBounds): PriceRange | null =>
  PRICE_RANGE_ORDER.find(
    (priceRange) =>
      PRICE_RANGE_BOUNDS[priceRange].minPrice === minPrice &&
      PRICE_RANGE_BOUNDS[priceRange].maxPrice === maxPrice,
  ) ?? null;

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
