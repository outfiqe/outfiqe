"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/context/AuthContext";

import { cartApi } from "../api/cartApi";
import { CART_QUERY_KEY } from "../cart.constants";

export const useCart = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: cartApi.get,
    enabled: isAuthenticated,
  });
};
