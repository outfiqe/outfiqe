"use client";

import { useQuery } from "@tanstack/react-query";

import { brandProductsApi } from "../api/brandProductsApi";

export const useBrandProducts = () => {
  return useQuery({ queryKey: ["brand-products"], queryFn: brandProductsApi.list });
};
