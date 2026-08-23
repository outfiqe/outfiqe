import type { ProductTypeSlug } from "@outfiqe/utils";

import { ProductType } from "#generated/prisma/enums.js";

export const PRODUCT_TYPE_TO_SLUG: Record<ProductType, ProductTypeSlug> = {
  [ProductType.TOPS]: "tops",
  [ProductType.BOTTOMS]: "bottoms",
  [ProductType.PANTS]: "pants",
  [ProductType.HEADWEAR]: "headwear",
  [ProductType.OUTERWEAR]: "outerwear",
  [ProductType.DRESSES]: "dresses",
};

export const SLUG_TO_PRODUCT_TYPE: Record<ProductTypeSlug, ProductType> = {
  tops: ProductType.TOPS,
  bottoms: ProductType.BOTTOMS,
  pants: ProductType.PANTS,
  headwear: ProductType.HEADWEAR,
  outerwear: ProductType.OUTERWEAR,
  dresses: ProductType.DRESSES,
};

export const PRODUCT_TYPE_SLUGS = Object.values(PRODUCT_TYPE_TO_SLUG);

export const NEW_ARRIVAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const LOW_STOCK_THRESHOLD = 5;

export const TRENDING_LIMIT = 5;

export const AUTOCOMPLETE_LIMIT = 6;

export const PRODUCT_RATING_MIN = 1;
export const PRODUCT_RATING_MAX = 5;

export type { ProductTypeSlug };
