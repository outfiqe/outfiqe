import { z } from "zod";

import { orderTrackingStageSummarySchema } from "./orderSchemas";

export const PARCEL_STATUSES = [
  "PACKED",
  "HANDED_TO_PARTNER",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERY_FAILED",
  "DELIVERED",
  "RETURNING",
  "RETURNED_TO_HUB",
  "CANCELLED",
  "LOST",
] as const;

export const CUSTOMER_TRACKING_EVENT_CODES = [
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "AT_HUB",
  "PACKED",
  "HANDED_TO_PARTNER",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERY_FAILED",
  "DELIVERED",
  "RETURNING",
  "RETURNED_TO_HUB",
  "LOST",
  "CANCELLED",
  "DELIVERY_RESCHEDULED",
  "DELIVERY_DISPUTED",
] as const;
export type CustomerTrackingEventCode = (typeof CUSTOMER_TRACKING_EVENT_CODES)[number];

export const DELIVERY_FAILURE_REASONS = [
  "CUSTOMER_UNREACHABLE",
  "CUSTOMER_REFUSED",
  "WRONG_ADDRESS",
  "RESCHEDULED_BY_CUSTOMER",
  "WRONG_OR_DAMAGED_ITEM",
  "PARTNER_ISSUE",
  "OTHER",
] as const;

export const customerParcelSchema = z.object({
  shipmentId: z.string(),
  trackingCode: z.string(),
  status: z.enum(PARCEL_STATUSES),
  partnerName: z.string().nullable(),
  partnerTrackingUrl: z.string().nullable(),
  deliveredAt: z.string().nullable(),
  canReportNotReceived: z.boolean(),
  isReportedNotReceived: z.boolean(),
});
export type CustomerParcel = z.infer<typeof customerParcelSchema>;

export const customerTrackingEventSchema = z.object({
  id: z.string(),
  code: z.enum(CUSTOMER_TRACKING_EVENT_CODES),
  occurredAt: z.string(),
  brandName: z.string().nullable(),
  location: z.string().nullable(),
  reasonCode: z.enum(DELIVERY_FAILURE_REASONS).nullable(),
  shipmentId: z.string().nullable(),
});
export type CustomerTrackingEvent = z.infer<typeof customerTrackingEventSchema>;

export const customerOrderTrackingSchema = z.object({
  stage: orderTrackingStageSummarySchema.nullable(),
  parcels: z.array(customerParcelSchema),
  events: z.array(customerTrackingEventSchema),
});
export type CustomerOrderTracking = z.infer<typeof customerOrderTrackingSchema>;

export type ReportNotReceivedBody = { shipmentId: string; details: string };
