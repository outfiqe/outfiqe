"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { useAuth } from "@/features/auth/context/AuthContext";

import { ordersApi } from "../api/ordersApi";

export const useInfiniteOrders = () => {
  const { isShopper } = useAuth();
  return useInfiniteCursorPage(["orders"], (cursor) => ordersApi.list(cursor), isShopper);
};
