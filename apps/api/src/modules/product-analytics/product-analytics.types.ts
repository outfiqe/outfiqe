import type { AnalyticsEventName, AnalyticsEventProperties } from "@outfiqe/utils";

import type { PaymentMethod } from "#generated/prisma/enums.js";

export type OrderAnalyticsSummary = {
  orderId: string;
  userId: string;
  total: number;
  paymentMethod: PaymentMethod;
  itemQuantity: number;
  brandCount: number;
  earlierPlacedOrderCount: number;
  hasCreatorAttribution: boolean;
  hasCoupon: boolean;
};

export type ServerAnalyticsEvent<EventName extends AnalyticsEventName> = {
  distinctId: string;
  event: EventName;
  properties: AnalyticsEventProperties[EventName];
  sourceEventId?: string;
  hasPersonProfile?: boolean;
};
