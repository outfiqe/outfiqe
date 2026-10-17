export const orderQueryKey = (orderId: string) => ["orders", orderId] as const;

export const orderTrackingQueryKey = (orderId: string) =>
  [...orderQueryKey(orderId), "tracking"] as const;
