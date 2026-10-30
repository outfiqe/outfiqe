"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/context/AuthContext";

import { ordersApi } from "../api/ordersApi";
import { orderQueryKey } from "../constants/trackingQueryKeys";

export const useOrder = (orderId: string) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: orderQueryKey(orderId),
    queryFn: () => ordersApi.get(orderId),
    enabled: isAuthenticated,
  });
};
