export const REFUND_QUEUE_QUERY_KEY = ["admin-refund-queue"] as const;

export const orderRefundsQueryKey = (orderId: string) =>
  ["admin-orders", orderId, "refunds"] as const;
