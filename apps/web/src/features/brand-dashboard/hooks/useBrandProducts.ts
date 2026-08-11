"use client";

import { useInfiniteCursorPage } from "@outfiqe/shared-hooks";

import { brandProductsApi } from "../api/brandProductsApi";

export const useBrandProducts = () => {
  return useInfiniteCursorPage(["brand-products"], (cursor) => brandProductsApi.list(cursor));
};
