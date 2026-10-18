import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/lib/apiClient";

import { partnersApi } from "../api/partnersApi";
import type { DeliveryPartner, DeliveryPartnerBody } from "../api/partnersSchemas";
import { DELIVERY_PARTNERS_QUERY_KEY } from "../constants/partnerQueryKeys";

export const useSaveDeliveryPartner = (partnerId: string | null) =>
  useApiMutation<DeliveryPartner, ApiClientError, DeliveryPartnerBody>({
    successMessage: "Delivery partner saved.",
    mutationFn: (body) =>
      partnerId ? partnersApi.updatePartner(partnerId, body) : partnersApi.createPartner(body),
    invalidateKeys: [DELIVERY_PARTNERS_QUERY_KEY],
  });
