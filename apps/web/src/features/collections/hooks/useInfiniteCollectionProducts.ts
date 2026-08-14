"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { collectionsApi } from "../api/collectionsApi";

export const useInfiniteCollectionProducts = (slug: string) => {
  return useInfiniteCursorPage(["collection-products", slug], (cursor) =>
    collectionsApi.listProducts(slug, cursor),
  );
};
