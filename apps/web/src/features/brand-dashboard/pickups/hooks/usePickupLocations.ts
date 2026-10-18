"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth";

import { pickupLocationApi } from "../api/pickupLocationApi";
import { PICKUP_LOCATIONS_QUERY_KEY } from "../constants/pickupLocationQueryKeys";

export const usePickupLocations = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: PICKUP_LOCATIONS_QUERY_KEY,
    queryFn: () => pickupLocationApi.list(),
    enabled: isAuthenticated,
  });
};
