import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/lib/apiClient";
import { getErrorMessage } from "@/lib/errorMessages";

import { partnersApi } from "../api/partnersApi";
import type { DeliveryPartner, PartnerAccountBody } from "../api/partnersSchemas";
import { DELIVERY_PARTNERS_QUERY_KEY } from "../constants/partnerQueryKeys";

export const useSavePartnerAccount = (partnerId: string) =>
  useApiMutation<DeliveryPartner, ApiClientError, { hubId: string; account: PartnerAccountBody }>({
    errorMessage: getErrorMessage,
    successMessage: "Merchant account saved.",
    mutationFn: ({ hubId, account }) => partnersApi.saveAccount(partnerId, hubId, account),
    invalidateKeys: [DELIVERY_PARTNERS_QUERY_KEY],
  });
