import { z } from "zod";

import {
  bookingStatusSchema,
  parcelBookingSchema,
  shipmentStatusSchema,
} from "../../hub-operations/api/hubOperationsSchemas";

export const PARCEL_QUEUES = ["TO_BOOK", "TO_HAND_OVER", "WITH_PARTNER", "FINISHED"] as const;
export const parcelQueueSchema = z.enum(PARCEL_QUEUES);
export type ParcelQueue = z.infer<typeof parcelQueueSchema>;

export const PARCEL_EVENT_CODES = [
  "HANDED_TO_PARTNER",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERY_FAILED",
  "DELIVERED",
  "RETURNING",
  "RETURNED_TO_HUB",
  "LOST",
  "DELIVERY_RESCHEDULED",
  "NOTE",
] as const;
export const parcelEventCodeSchema = z.enum(PARCEL_EVENT_CODES);
export type ParcelEventCode = z.infer<typeof parcelEventCodeSchema>;

export const parcelSummarySchema = z.object({
  shipmentId: z.string(),
  orderId: z.string(),
  trackingCode: z.string(),
  displayTrackingCode: z.string(),
  status: shipmentStatusSchema,
  codAmountToCollect: z.number(),
  isLabelUpToDate: z.boolean(),
  recipientName: z.string(),
  city: z.string(),
  packedAt: z.string(),
  lastEventAt: z.string(),
  booking: parcelBookingSchema.nullable(),
});
export type ParcelSummary = z.infer<typeof parcelSummarySchema>;

export const parcelPageSchema = z.object({
  items: z.array(parcelSummarySchema),
  nextCursor: z.string().nullable(),
});
export type ParcelPage = z.infer<typeof parcelPageSchema>;

export const parcelEventSchema = z.object({
  id: z.string(),
  code: z.string(),
  source: z.string(),
  rawStatus: z.string().nullable(),
  reasonCode: z.string().nullable(),
  note: z.string().nullable(),
  occurredAt: z.string(),
  appliedToStatus: z.boolean(),
  partnerName: z.string().nullable(),
  actorName: z.string().nullable(),
});
export type ParcelEvent = z.infer<typeof parcelEventSchema>;

export const parcelDetailSchema = parcelSummarySchema.extend({
  hubId: z.string(),
  currency: z.string(),
  weightGrams: z.number(),
  parcelCount: z.number(),
  deliveryAttemptCount: z.number(),
  deliveredAt: z.string().nullable(),
  labelPrintedAt: z.string().nullable(),
  pickups: z.array(
    z.object({
      fulfilmentGroupId: z.string(),
      brandName: z.string(),
      items: z.array(
        z.object({
          orderItemId: z.string(),
          productName: z.string(),
          sizeLabel: z.string(),
          units: z.number(),
        }),
      ),
    }),
  ),
  events: z.array(parcelEventSchema),
});
export type ParcelDetail = z.infer<typeof parcelDetailSchema>;

export const parcelLabelSchema = z.object({
  shipmentId: z.string(),
  trackingCode: z.string(),
  displayTrackingCode: z.string(),
  orderId: z.string(),
  status: shipmentStatusSchema,
  currency: z.string(),
  codAmountToCollect: z.number(),
  isLabelUpToDate: z.boolean(),
  labelPrintedAt: z.string().nullable(),
  weightGrams: z.number(),
  parcelCount: z.number(),
  packedAt: z.string(),
  recipient: z.object({
    fullName: z.string(),
    phone: z.string(),
    address: z.string(),
    city: z.string(),
    landmark: z.string().nullable(),
  }),
  sender: z.object({ name: z.string(), address: z.string(), city: z.string(), phone: z.string() }),
  partner: z
    .object({
      name: z.string(),
      partnerReference: z.string().nullable(),
      partnerLabelUrl: z.string().nullable(),
      status: bookingStatusSchema,
    })
    .nullable(),
});
export type ParcelLabel = z.infer<typeof parcelLabelSchema>;

export type RecordParcelUpdateBody = {
  code: ParcelEventCode;
  note: string;
  rawStatus?: string;
  isCorrection: boolean;
};
