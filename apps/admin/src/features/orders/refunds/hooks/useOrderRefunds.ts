import { useQuery } from "@tanstack/react-query";

import { refundsApi } from "../api/refundsApi";
import { orderRefundsQueryKey } from "../constants/refundQueryKeys";

export const useOrderRefunds = (orderId: string) =>
  useQuery({
    queryKey: orderRefundsQueryKey(orderId),
    queryFn: () => refundsApi.listForOrder(orderId),
  });
