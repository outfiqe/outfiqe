"use client";

import { useQuery } from "@tanstack/react-query";

import { deliveryZoneApi } from "../api/deliveryZoneApi";

export const useCitySearch = (q: string, enabled: boolean) => {
  return useQuery({
    queryKey: ["delivery-zone-cities", q],
    queryFn: () => deliveryZoneApi.searchCities(q),
    enabled,
  });
};
