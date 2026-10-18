export const DELIVERY_PARTNERS_QUERY_KEY = ["logistics-delivery-partners"] as const;

export const deliveryPartnerQueryKey = (partnerId: string) =>
  [...DELIVERY_PARTNERS_QUERY_KEY, partnerId] as const;

export const partnerWebhookReceiptsQueryKey = (partnerId: string) =>
  [...deliveryPartnerQueryKey(partnerId), "webhook-receipts"] as const;
