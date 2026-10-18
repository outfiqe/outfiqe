import { toast } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/lib/apiClient";
import { getErrorMessage } from "@/lib/errorMessages";

import { parcelsApi } from "../api/parcelsApi";
import type { ParcelLabel } from "../api/parcelsSchemas";
import { PARCELS_QUERY_KEY } from "../constants/parcelQueryKeys";

export const useMarkLabelPrinted = (shipmentId: string) =>
  useApiMutation<ParcelLabel, ApiClientError, void>({
    mutationFn: () => parcelsApi.markLabelPrinted(shipmentId),
    invalidateKeys: [PARCELS_QUERY_KEY],
    onError: (error) => toast.error(getErrorMessage(error)),
  });
