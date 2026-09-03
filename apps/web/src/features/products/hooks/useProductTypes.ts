"use client";

import { useQuery } from "@tanstack/react-query";

import { productTypesApi } from "../api/productTypesApi";

const PRODUCT_TYPES_STALE_TIME_MS = 10 * 60 * 1000;

export const useProductTypes = () => {
  return useQuery({
    queryKey: ["product-types"],
    queryFn: productTypesApi.list,
    staleTime: PRODUCT_TYPES_STALE_TIME_MS,
  });
};

export const useAssignableProductTypes = () => {
  return useQuery({
    queryKey: ["product-types", "assignable"],
    queryFn: productTypesApi.listAssignable,
    staleTime: PRODUCT_TYPES_STALE_TIME_MS,
  });
};
