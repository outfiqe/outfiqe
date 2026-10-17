import { useQuery } from "@tanstack/react-query";

import { partnersApi } from "../api/partnersApi";
import { deliveryPartnerQueryKey } from "../constants/partnerQueryKeys";

export const useDeliveryPartner = (partnerId: string) =>
  useQuery({
    queryKey: deliveryPartnerQueryKey(partnerId),
    queryFn: () => partnersApi.getPartner(partnerId),
  });
