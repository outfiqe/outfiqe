import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/lib/apiClient";

import { parcelsApi } from "../api/parcelsApi";
import type { ReturnCheckInBody, ReturnedParcel } from "../api/parcelsSchemas";
import { PARCELS_QUERY_KEY } from "../constants/parcelQueryKeys";

export const useCheckInReturn = (shipmentId: string) =>
  useApiMutation<ReturnedParcel, ApiClientError, ReturnCheckInBody>({
    successMessage: "Return checked in. Refunds and returns to the brands are under way.",
    mutationFn: (body) => parcelsApi.checkInReturn(shipmentId, body),
    invalidateKeys: [PARCELS_QUERY_KEY],
  });
