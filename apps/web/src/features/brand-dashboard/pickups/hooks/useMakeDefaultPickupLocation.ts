"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { pickupLocationApi } from "../api/pickupLocationApi";
import { PICKUP_LOCATIONS_QUERY_KEY } from "../constants/pickupLocationQueryKeys";

export const useMakeDefaultPickupLocation = () =>
  useApiMutation<void, ApiClientError, string>({
    mutationFn: (locationId) => pickupLocationApi.makeDefault(locationId),
    invalidateKeys: [PICKUP_LOCATIONS_QUERY_KEY],
  });
