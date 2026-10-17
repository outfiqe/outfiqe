import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/lib/apiClient";

import type { ParcelBooking } from "../../hub-operations/api/hubOperationsSchemas";
import { parcelsApi } from "../api/parcelsApi";
import { PARCELS_QUERY_KEY } from "../constants/parcelQueryKeys";

export const useRebookParcel = (shipmentId: string) =>
  useApiMutation<ParcelBooking, ApiClientError, { partnerId: string; reason: string }>({
    successMessage: "Partner changed. Book the parcel with them.",
    mutationFn: (body) => parcelsApi.rebookParcel(shipmentId, body),
    invalidateKeys: [PARCELS_QUERY_KEY],
  });
