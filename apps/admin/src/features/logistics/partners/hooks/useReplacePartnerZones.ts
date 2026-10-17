import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/lib/apiClient";

import { partnersApi } from "../api/partnersApi";
import type { DeliveryPartner, PartnerZonesBody } from "../api/partnersSchemas";
import { DELIVERY_PARTNERS_QUERY_KEY } from "../constants/partnerQueryKeys";

export const useReplacePartnerZones = (partnerId: string) =>
  useApiMutation<DeliveryPartner, ApiClientError, PartnerZonesBody>({
    successMessage: "Delivery areas saved.",
    mutationFn: (body) => partnersApi.replaceZones(partnerId, body),
    invalidateKeys: [DELIVERY_PARTNERS_QUERY_KEY],
  });
