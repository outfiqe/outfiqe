"use client";

import { useQuery } from "@tanstack/react-query";

import { creatorLooksApi } from "../api/creatorLooksApi";
import { FALLBACK_MAX_TAGGED_PRODUCTS } from "../components/PostModal.constants";

export const LOOK_LIMITS_QUERY_KEY = ["creator-looks", "limits"];

const LOOK_LIMITS_STALE_TIME_MS = 5 * 60 * 1000;

export const useMaxTaggedProducts = (): number => {
  const { data: lookLimits } = useQuery({
    queryKey: LOOK_LIMITS_QUERY_KEY,
    queryFn: creatorLooksApi.getLimits,
    staleTime: LOOK_LIMITS_STALE_TIME_MS,
  });
  return lookLimits?.maxTaggedProducts ?? FALLBACK_MAX_TAGGED_PRODUCTS;
};
