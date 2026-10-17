export const ORDERS_TO_PACK_QUERY_KEY = ["logistics-orders-to-pack"] as const;

export const ordersToPackQueryKey = (hubId: string | null) =>
  [...ORDERS_TO_PACK_QUERY_KEY, hubId ?? "none"] as const;
