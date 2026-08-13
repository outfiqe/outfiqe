"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";
import { brandProfileApi } from "../api/brandProfileApi";

export const useInfiniteBrandProducts = (brandId: string, type?: string) => {
  return useInfiniteCursorPage(["brand-products", brandId, type ?? "all"], (cursor) =>
    brandProfileApi.listProducts(brandId, cursor, type),
  );
};
