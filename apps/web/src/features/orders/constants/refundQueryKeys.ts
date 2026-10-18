export const orderRefundsQueryKey = (orderId: string) => ["orders", orderId, "refunds"] as const;

export const refundDestinationQueryKey = (orderId: string) =>
  ["orders", orderId, "refund-destination"] as const;
