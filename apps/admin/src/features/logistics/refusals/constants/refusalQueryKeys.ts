export const customerRefusalsQueryKey = (orderId: string) =>
  ["logistics-customer-refusals", orderId] as const;
