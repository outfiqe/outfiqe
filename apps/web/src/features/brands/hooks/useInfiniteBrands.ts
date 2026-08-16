"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { brandsApi } from "../api/brandsApi";

export const useInfiniteBrands = () => {
  return useInfiniteCursorPage(["brands"], (cursor) => brandsApi.list(cursor));
};
