import { useApiMutation } from "@outfiqe/hooks";
import { generateUuid } from "@outfiqe/utils";

import type { ApiClientError } from "@/lib/apiClient";

import { PARCELS_QUERY_KEY } from "../../shipments/constants/parcelQueryKeys";
import { hubOperationsApi } from "../api/hubOperationsApi";
import type { ParcelHandover } from "../api/hubOperationsSchemas";

export const useHandOverParcel = () =>
  useApiMutation<ParcelHandover, ApiClientError, { hubId: string; code: string }>({
    mutationFn: (body) => hubOperationsApi.handOverParcel(body, generateUuid()),
    invalidateKeys: [PARCELS_QUERY_KEY],
  });
