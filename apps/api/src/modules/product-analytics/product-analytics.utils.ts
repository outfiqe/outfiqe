import { createHash } from "node:crypto";

import type { ANALYTICS_EVENTS } from "@outfiqe/utils";
import {
  type AnalyticsEventProperties,
  type AnalyticsTrackedOrderStatus,
  toAnalyticsPaymentMethod,
} from "@outfiqe/utils";

import type { FulfilmentStatus } from "#generated/prisma/enums.js";

import {
  STABLE_EVENT_UUID_NAMESPACE,
  TRACKED_ORDER_STATUS_BY_FULFILMENT,
} from "./product-analytics.constants.js";
import type { OrderAnalyticsSummary } from "./product-analytics.types.js";

const NO_EARLIER_PLACED_ORDERS = 0;
const UUID_BYTE_LENGTH = 16;
const UUID_VERSION_BYTE_INDEX = 6;
const UUID_VARIANT_BYTE_INDEX = 8;
const UUID_VERSION_CLEAR_MASK = 0x0f;
const UUID_VERSION_5_BITS = 0x50;
const UUID_VARIANT_CLEAR_MASK = 0x3f;
const UUID_VARIANT_RFC_4122_BITS = 0x80;
const UUID_HEX_GROUP_RANGES = [
  [0, 8],
  [8, 12],
  [12, 16],
  [16, 20],
  [20, 32],
] as const;

const toHyphenatedUuid = (hex: string): string =>
  UUID_HEX_GROUP_RANGES.map(([groupStart, groupEnd]) => hex.slice(groupStart, groupEnd)).join("-");

export const toStableEventUuid = (sourceEventId: string): string => {
  const uuidBytes = createHash("sha1")
    .update(`${STABLE_EVENT_UUID_NAMESPACE}:${sourceEventId}`)
    .digest()
    .subarray(0, UUID_BYTE_LENGTH);
  uuidBytes.writeUInt8(
    (uuidBytes.readUInt8(UUID_VERSION_BYTE_INDEX) & UUID_VERSION_CLEAR_MASK) | UUID_VERSION_5_BITS,
    UUID_VERSION_BYTE_INDEX,
  );
  uuidBytes.writeUInt8(
    (uuidBytes.readUInt8(UUID_VARIANT_BYTE_INDEX) & UUID_VARIANT_CLEAR_MASK) |
      UUID_VARIANT_RFC_4122_BITS,
    UUID_VARIANT_BYTE_INDEX,
  );
  return toHyphenatedUuid(uuidBytes.toString("hex"));
};

export const toTrackedOrderStatus = (
  fulfilmentStatus: FulfilmentStatus,
): AnalyticsTrackedOrderStatus | null =>
  TRACKED_ORDER_STATUS_BY_FULFILMENT[fulfilmentStatus] ?? null;

export const toOrderPlacedProperties = (
  summary: OrderAnalyticsSummary,
): AnalyticsEventProperties[typeof ANALYTICS_EVENTS.ORDER_PLACE] | null => {
  const paymentMethod = toAnalyticsPaymentMethod(summary.paymentMethod);
  if (!paymentMethod) return null;

  return {
    order_id: summary.orderId,
    order_total_npr: summary.total,
    cart_item_count: summary.itemQuantity,
    brand_count: summary.brandCount,
    payment_method: paymentMethod,
    is_first_order: summary.earlierPlacedOrderCount === NO_EARLIER_PLACED_ORDERS,
    has_creator_attribution: summary.hasCreatorAttribution,
    has_coupon: summary.hasCoupon,
  };
};
