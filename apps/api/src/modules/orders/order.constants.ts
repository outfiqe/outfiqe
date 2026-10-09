import { FulfilmentStatus } from "#generated/prisma/enums.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export const STALE_SHIPMENT_REMINDER_MIN_AGE_DAYS = 7;
export const STALE_SHIPMENT_REMINDER_INTERVAL_MS = DAY_MS;

export const FULFILMENT_ADVANCE_FROM: Partial<Record<FulfilmentStatus, FulfilmentStatus[]>> = {
  [FulfilmentStatus.PACKED]: [FulfilmentStatus.PLACED],
  [FulfilmentStatus.SHIPPED]: [FulfilmentStatus.PACKED],
  [FulfilmentStatus.DELIVERED]: [FulfilmentStatus.SHIPPED],
};

export const NOTHING_ALREADY_PAID = 0;
export const ORDER_AUDIT_TARGET_TYPE = "Order";
