"use client";

import { useShopperMeasurements } from "@/features/size-fit";

import type { OutfitProduct } from "../api/outfitSchemas";
import { toMySizeByProductId } from "../utils/outfitBoardRules";

export const useMySizeByProductId = (
  products: readonly OutfitProduct[],
): ReadonlyMap<string, string> => {
  const measurements = useShopperMeasurements();
  return toMySizeByProductId(products, measurements);
};
