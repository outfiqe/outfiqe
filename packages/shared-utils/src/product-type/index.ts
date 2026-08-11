export const PRODUCT_TYPE_SLUGS = [
  "tops",
  "bottoms",
  "pants",
  "headwear",
  "outerwear",
  "dresses",
] as const;

export type ProductTypeSlug = (typeof PRODUCT_TYPE_SLUGS)[number];
