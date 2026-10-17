import { TrackingEventCode } from "#generated/prisma/enums.js";

export const DELIVERY_DISPUTE_WINDOW_DAYS = 3;
export const MAX_CUSTOMER_TRACKING_EVENTS = 100;
export const PARTNER_REFERENCE_PLACEHOLDER = "{reference}";
export const DELIVERY_DISPUTE_DEDUPE_PREFIX = "delivery-disputed";

export const CUSTOMER_STATUS_EVENT_CODES = [
  TrackingEventCode.READY_FOR_PICKUP,
  TrackingEventCode.PICKED_UP,
  TrackingEventCode.AT_HUB,
  TrackingEventCode.PACKED,
  TrackingEventCode.HANDED_TO_PARTNER,
  TrackingEventCode.IN_TRANSIT,
  TrackingEventCode.OUT_FOR_DELIVERY,
  TrackingEventCode.DELIVERY_FAILED,
  TrackingEventCode.DELIVERED,
  TrackingEventCode.RETURNING,
  TrackingEventCode.RETURNED_TO_HUB,
  TrackingEventCode.LOST,
  TrackingEventCode.CANCELLED,
];

export const CUSTOMER_NOTICE_EVENT_CODES = [
  TrackingEventCode.DELIVERY_RESCHEDULED,
  TrackingEventCode.DELIVERY_DISPUTED,
];
