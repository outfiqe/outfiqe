import type { AnalyticsCreatorLinkType, AnalyticsTrackedOrderStatus } from "@outfiqe/utils";

import { CreatorLinkType, FulfilmentStatus } from "#generated/prisma/enums.js";

export const PRODUCT_ANALYTICS_CONSUMER_GROUP = "product-analytics";

export const ANALYTICS_EVENT_SOURCE = "api";

export const STABLE_EVENT_UUID_NAMESPACE = "outfiqe-product-analytics";

export const TRACKED_ORDER_STATUS_BY_FULFILMENT: Partial<
  Record<FulfilmentStatus, AnalyticsTrackedOrderStatus>
> = {
  [FulfilmentStatus.DELIVERED]: "delivered",
  [FulfilmentStatus.CANCELLED]: "cancelled",
  [FulfilmentStatus.RETURNED]: "returned",
};

export const ANALYTICS_CREATOR_LINK_TYPE: Record<CreatorLinkType, AnalyticsCreatorLinkType> = {
  [CreatorLinkType.INTERNAL_SINGLE_USE]: "internal_single_use",
  [CreatorLinkType.EXTERNAL_REUSABLE]: "external_reusable",
};

export const ANONYMOUS_DISTINCT_ID_PREFIX = {
  BRAND_APPLICATION: "brand_application",
  SUPPORT_TICKET: "support_ticket",
  LINK_SESSION: "link_session",
} as const;
