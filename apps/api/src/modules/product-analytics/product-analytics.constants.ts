import type { AnalyticsCreatorLinkType, AnalyticsTrackedOrderStatus } from "@outfiqe/utils";
import { hoursToSeconds } from "date-fns/hoursToSeconds";

import { CreatorLinkType, FulfilmentStatus } from "#generated/prisma/enums.js";

const HOURS_IN_A_DAY = 24;
const ORDER_STATUS_MEMORY_DAYS = 365;

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

export const ORDER_STATUS_ARRIVAL_TTL_SECONDS = hoursToSeconds(
  HOURS_IN_A_DAY * ORDER_STATUS_MEMORY_DAYS,
);

export const ORDER_STATUS_ARRIVAL_CACHE_NAMESPACE = "product-analytics-order-status";

export const ANALYTICS_CREATOR_LINK_TYPE: Record<CreatorLinkType, AnalyticsCreatorLinkType> = {
  [CreatorLinkType.INTERNAL_SINGLE_USE]: "internal_single_use",
  [CreatorLinkType.EXTERNAL_REUSABLE]: "external_reusable",
};

export const ANONYMOUS_DISTINCT_ID_PREFIX = {
  BRAND_APPLICATION: "brand_application",
  SUPPORT_TICKET: "support_ticket",
  LINK_SESSION: "link_session",
} as const;
