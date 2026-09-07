export const SHARED_CONTENT_REVALIDATE_SECONDS = 120;

export const SERVER_CACHE_TAGS = {
  categories: "categories",
  productTypes: "product-types",
  heroSlides: "hero-slides",
  collections: "collections",
} as const;

export type ServerCacheTag = (typeof SERVER_CACHE_TAGS)[keyof typeof SERVER_CACHE_TAGS];
