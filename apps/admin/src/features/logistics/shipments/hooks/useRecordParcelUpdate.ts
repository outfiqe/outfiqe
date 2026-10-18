import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/lib/apiClient";

import { parcelsApi } from "../api/parcelsApi";
import type { ParcelDetail, RecordParcelUpdateBody } from "../api/parcelsSchemas";
import { PARCELS_QUERY_KEY } from "../constants/parcelQueryKeys";

export const useRecordParcelUpdate = (shipmentId: string) =>
  useApiMutation<ParcelDetail, ApiClientError, RecordParcelUpdateBody>({
    successMessage: "Parcel updated.",
    mutationFn: (body) => parcelsApi.recordUpdate(shipmentId, body),
    invalidateKeys: [PARCELS_QUERY_KEY],
  });
