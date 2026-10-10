import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { ordersApi } from "../api/ordersApi";
import type { FulfilmentStatusValue } from "../api/ordersSchemas";

export const useInfiniteOrders = (status?: FulfilmentStatusValue) => {
  return useInfiniteCursorPage(["admin-orders", status ?? "ALL"], (cursor) =>
    ordersApi.list(status, cursor),
  );
};
