import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { ordersApi } from "../api";
import type { FulfilmentStatusValue } from "../schemas";

export const useInfiniteOrders = (status?: FulfilmentStatusValue) => {
  return useInfiniteCursorPage(["admin-orders", status ?? "ALL"], (cursor) =>
    ordersApi.list(status, cursor),
  );
};
