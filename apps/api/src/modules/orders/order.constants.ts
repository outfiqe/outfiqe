import { millisecondsInDay } from "date-fns/constants";
import { hoursToMilliseconds } from "date-fns/hoursToMilliseconds";
import { minutesToMilliseconds } from "date-fns/minutesToMilliseconds";

import { FulfilmentStatus } from "#generated/prisma/enums.js";

export const STALE_SHIPMENT_REMINDER_MIN_AGE_DAYS = 7;
export const STALE_SHIPMENT_REMINDER_INTERVAL_MS = millisecondsInDay;

export const STALE_PENDING_REFUND_SWEEP_INTERVAL_MS = minutesToMilliseconds(5);

export const REFUND_DETAILS_REMINDER_INTERVAL_MS = hoursToMilliseconds(6);

export const FULFILMENT_ADVANCE_FROM: Partial<Record<FulfilmentStatus, FulfilmentStatus[]>> = {
  [FulfilmentStatus.PACKED]: [FulfilmentStatus.PLACED],
  [FulfilmentStatus.SHIPPED]: [FulfilmentStatus.PACKED],
  [FulfilmentStatus.DELIVERED]: [FulfilmentStatus.SHIPPED],
};

export const NOTHING_ALREADY_PAID = 0;
export const ORDER_AUDIT_TARGET_TYPE = "Order";
