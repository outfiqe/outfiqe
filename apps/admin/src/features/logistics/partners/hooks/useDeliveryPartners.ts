import { useQuery } from "@tanstack/react-query";

import { partnersApi } from "../api/partnersApi";
import { DELIVERY_PARTNERS_QUERY_KEY } from "../constants/partnerQueryKeys";

export const useDeliveryPartners = () =>
  useQuery({ queryKey: DELIVERY_PARTNERS_QUERY_KEY, queryFn: partnersApi.listPartners });
