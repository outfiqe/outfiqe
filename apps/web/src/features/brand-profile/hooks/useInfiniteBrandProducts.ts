"use client";

import { useInfiniteCursorPage } from "@outfiqe/shared-hooks";
import { brandProfileApi } from "../api/brandProfileApi";

export const useInfiniteBrandProducts = (brandId: string) => {
  return useInfiniteCursorPage(["brand-products", brandId], (cursor) =>
    brandProfileApi.listProducts(brandId, cursor),
  );
};
