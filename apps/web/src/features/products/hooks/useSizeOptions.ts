"use client";

import type { ProductTypeSlug } from "@outfiqe/utils";
import { useQuery } from "@tanstack/react-query";

import { sizeOptionsApi } from "../api/sizeOptionsApi";

const SIZE_OPTIONS_STALE_TIME_MS = 10 * 60 * 1000;

export const useSizeOptions = (type: ProductTypeSlug) => {
  return useQuery({
    queryKey: ["size-options", type],
    queryFn: () => sizeOptionsApi.listByType(type),
    staleTime: SIZE_OPTIONS_STALE_TIME_MS,
  });
};
