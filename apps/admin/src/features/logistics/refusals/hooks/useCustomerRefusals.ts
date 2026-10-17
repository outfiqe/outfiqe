import { useQuery } from "@tanstack/react-query";

import { refusalsApi } from "../api/refusalsApi";
import { customerRefusalsQueryKey } from "../constants/refusalQueryKeys";

export const useCustomerRefusals = (orderId: string) =>
  useQuery({
    queryKey: customerRefusalsQueryKey(orderId),
    queryFn: () => refusalsApi.getForOrder(orderId),
    retry: false,
  });
