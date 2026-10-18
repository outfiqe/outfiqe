"use client";

import { useDebouncedValue } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";

import { deliveryZoneApi } from "../api/deliveryZoneApi";

const CITY_ESTIMATE_DEBOUNCE_MS = 400;

export const useDeliveryEstimate = (city: string) => {
  const debouncedCity = useDebouncedValue(city.trim(), CITY_ESTIMATE_DEBOUNCE_MS);

  return useQuery({
    queryKey: ["delivery-estimate", debouncedCity],
    queryFn: () => deliveryZoneApi.estimate(debouncedCity),
    enabled: debouncedCity.length > 0,
  });
};
