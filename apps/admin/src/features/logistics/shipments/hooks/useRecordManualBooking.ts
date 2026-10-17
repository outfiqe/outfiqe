import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/lib/apiClient";

import type { ParcelBooking } from "../../hub-operations/api/hubOperationsSchemas";
import { parcelsApi } from "../api/parcelsApi";
import { PARCELS_QUERY_KEY } from "../constants/parcelQueryKeys";

export const useRecordManualBooking = (shipmentId: string) =>
  useApiMutation<ParcelBooking, ApiClientError, string>({
    successMessage: "Booking saved.",
    mutationFn: (partnerReference) => parcelsApi.recordManualBooking(shipmentId, partnerReference),
    invalidateKeys: [PARCELS_QUERY_KEY],
  });
