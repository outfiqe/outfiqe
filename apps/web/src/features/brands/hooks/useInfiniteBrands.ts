"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { brandsApi } from "../api/brandsApi";
import { BRANDS_QUERY_KEY } from "../brands.constants";

export const useInfiniteBrands = (enabled = true) => {
  return useInfiniteCursorPage(BRANDS_QUERY_KEY, (cursor) => brandsApi.list(cursor), enabled);
};
