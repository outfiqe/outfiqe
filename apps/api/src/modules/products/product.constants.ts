import { ProductType, TasteCategory } from "../../generated/prisma/enums.js";

export const PRODUCT_TYPE_SLUGS = [
  "tops",
  "bottoms",
  "pants",
  "headwear",
  "outerwear",
  "dresses",
] as const;
export type ProductTypeSlug = (typeof PRODUCT_TYPE_SLUGS)[number];

export const TASTE_CATEGORY_SLUGS = [
  "formal",
  "traditional",
  "streetwear",
  "casual",
  "minimal",
  "y2k",
  "old-money",
] as const;
export type TasteCategorySlug = (typeof TASTE_CATEGORY_SLUGS)[number];

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

export const TASTE_CATEGORY_TO_SLUG: Record<TasteCategory, TasteCategorySlug> = {
  [TasteCategory.FORMAL]: "formal",
  [TasteCategory.TRADITIONAL]: "traditional",
  [TasteCategory.STREETWEAR]: "streetwear",
  [TasteCategory.CASUAL]: "casual",
  [TasteCategory.MINIMAL]: "minimal",
  [TasteCategory.Y2K]: "y2k",
  [TasteCategory.OLD_MONEY]: "old-money",
};

export const SLUG_TO_TASTE_CATEGORY: Record<TasteCategorySlug, TasteCategory> = {
  formal: TasteCategory.FORMAL,
  traditional: TasteCategory.TRADITIONAL,
  streetwear: TasteCategory.STREETWEAR,
  casual: TasteCategory.CASUAL,
  minimal: TasteCategory.MINIMAL,
  y2k: TasteCategory.Y2K,
  "old-money": TasteCategory.OLD_MONEY,
};
