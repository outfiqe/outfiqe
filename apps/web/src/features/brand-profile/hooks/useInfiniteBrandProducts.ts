"use client";

import { useInfiniteCursorPage } from "@/shared/hooks/useInfiniteCursorPage";
import { brandProfileApi } from "../api/brandProfileApi";

export const useInfiniteBrandProducts = (brandId: string) => {
  return useInfiniteCursorPage(["brand-products", brandId], (cursor) =>
    brandProfileApi.listProducts(brandId, cursor),
  );
};
