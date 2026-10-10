import { useQuery } from "@tanstack/react-query";

import { ordersApi } from "../api/ordersApi";

export const useOrder = (orderId: string) => {
  return useQuery({
    queryKey: ["admin-orders", orderId],
    queryFn: () => ordersApi.get(orderId),
  });
};
