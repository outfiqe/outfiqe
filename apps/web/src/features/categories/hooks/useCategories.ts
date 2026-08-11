"use client";

import { useQuery } from "@tanstack/react-query";

import { categoriesApi } from "../api/categoriesApi";

const CATEGORIES_STALE_TIME_MS = 10 * 60 * 1000;

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
    staleTime: CATEGORIES_STALE_TIME_MS,
  });
};
