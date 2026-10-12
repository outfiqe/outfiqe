"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";
import type { FitMeasurements } from "@outfiqe/utils";

import { fittingProductsApi } from "../api/fittingProductsApi";

export const useInfiniteFittingProducts = (
  measurements: FitMeasurements | null,
  type: string | undefined,
  enabled: boolean,
) =>
  useInfiniteCursorPage(
    ["fitting-products", measurements?.heightCm, measurements?.weightKg, type],
    (cursor) =>
      measurements
        ? fittingProductsApi.list({ ...measurements, type, cursor })
        : Promise.resolve({ products: [], nextCursor: null, total: 0 }),
    enabled && measurements !== null,
  );
