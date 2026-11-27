import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { ordersApi } from "../api/ordersApi";
import type { FulfilmentStatusValue } from "../api/ordersSchemas";

export const useInfiniteOrders = (status?: FulfilmentStatusValue, search?: string) => {
  return useInfiniteCursorPage(["admin-orders", status ?? "ALL", search ?? ""], (cursor) =>
    ordersApi.list({ status, search, cursor }),
  );
};
