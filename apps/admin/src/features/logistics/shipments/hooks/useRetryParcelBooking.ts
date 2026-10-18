import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/lib/apiClient";
import { getErrorMessage } from "@/lib/errorMessages";

import type { ParcelBooking } from "../../hub-operations/api/hubOperationsSchemas";
import { parcelsApi } from "../api/parcelsApi";
import { PARCELS_QUERY_KEY } from "../constants/parcelQueryKeys";

export const useRetryParcelBooking = (shipmentId: string) =>
  useApiMutation<ParcelBooking, ApiClientError, void>({
    errorMessage: getErrorMessage,
    successMessage: "Sent to the partner again.",
    mutationFn: () => parcelsApi.retryBooking(shipmentId),
    invalidateKeys: [PARCELS_QUERY_KEY],
  });
