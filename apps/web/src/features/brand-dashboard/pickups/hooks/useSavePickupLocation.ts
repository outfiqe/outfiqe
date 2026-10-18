"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { pickupLocationApi } from "../api/pickupLocationApi";
import type { PickupLocation, PickupLocationRequestBody } from "../api/pickupLocationSchemas";
import { PICKUP_LOCATIONS_QUERY_KEY } from "../constants/pickupLocationQueryKeys";

type SavePickupLocationInput = {
  locationId: string | null;
  body: PickupLocationRequestBody;
};

export const useSavePickupLocation = () =>
  useApiMutation<PickupLocation, ApiClientError, SavePickupLocationInput>({
    mutationFn: ({ locationId, body }) =>
      locationId === null
        ? pickupLocationApi.create(body)
        : pickupLocationApi.update(locationId, body),
    invalidateKeys: [PICKUP_LOCATIONS_QUERY_KEY],
  });
