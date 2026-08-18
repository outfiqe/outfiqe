"use client";

import { useQuery } from "@tanstack/react-query";

import { productsApi } from "../api/productsApi";

const AUTOCOMPLETE_STALE_TIME_MS = 60_000;

export const useProductAutocomplete = (q: string, enabled: boolean) => {
  return useQuery({
    queryKey: ["product-autocomplete", q],
    queryFn: () => productsApi.autocomplete(q),
    enabled,
    staleTime: AUTOCOMPLETE_STALE_TIME_MS,
    placeholderData: (previous) => previous,
  });
};
