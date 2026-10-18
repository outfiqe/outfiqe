import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/lib/apiClient";
import { getErrorMessage } from "@/lib/errorMessages";

import { partnersApi } from "../api/partnersApi";
import type { DeliveryPartner, PartnerStatusMapping } from "../api/partnersSchemas";
import { DELIVERY_PARTNERS_QUERY_KEY } from "../constants/partnerQueryKeys";

export const useSavePartnerStatusMap = (partnerId: string) =>
  useApiMutation<DeliveryPartner, ApiClientError, PartnerStatusMapping[]>({
    errorMessage: getErrorMessage,
    successMessage: "Status names saved.",
    mutationFn: (mappings) => partnersApi.saveStatusMap(partnerId, mappings),
    invalidateKeys: [DELIVERY_PARTNERS_QUERY_KEY],
  });
