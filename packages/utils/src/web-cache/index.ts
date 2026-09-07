export const WEB_REVALIDATE_TAGS = {
  categories: "categories",
  productTypes: "product-types",
  heroSlides: "hero-slides",
  collections: "collections",
} as const;

export type WebRevalidateTag = (typeof WEB_REVALIDATE_TAGS)[keyof typeof WEB_REVALIDATE_TAGS];

const WEB_REVALIDATE_TAG_VALUES = new Set<string>(Object.values(WEB_REVALIDATE_TAGS));

export const isWebRevalidateTag = (value: unknown): value is WebRevalidateTag =>
  typeof value === "string" && WEB_REVALIDATE_TAG_VALUES.has(value);
