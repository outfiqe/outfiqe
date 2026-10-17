import { isFuture } from "date-fns/isFuture";
import { z } from "zod";

import { DeliveryFailureReason, TrackingEventCode } from "#generated/prisma/enums.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MIN_NOTE_LENGTH = 3;
const MAX_NOTE_LENGTH = 500;
const MAX_RAW_STATUS_LENGTH = 120;

export const SHIPMENT_QUEUE = {
  TO_BOOK: "TO_BOOK",
  TO_HAND_OVER: "TO_HAND_OVER",
  WITH_PARTNER: "WITH_PARTNER",
  FINISHED: "FINISHED",
} as const;

export type ShipmentQueue = (typeof SHIPMENT_QUEUE)[keyof typeof SHIPMENT_QUEUE];

const MANUAL_PARCEL_EVENT_CODES = [
  TrackingEventCode.HANDED_TO_PARTNER,
  TrackingEventCode.IN_TRANSIT,
  TrackingEventCode.OUT_FOR_DELIVERY,
  TrackingEventCode.DELIVERY_FAILED,
  TrackingEventCode.DELIVERED,
  TrackingEventCode.RETURNING,
  TrackingEventCode.RETURNED_TO_HUB,
  TrackingEventCode.LOST,
  TrackingEventCode.DELIVERY_RESCHEDULED,
  TrackingEventCode.NOTE,
] as const;

const pageSchema = {
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
};

export const listShipmentsQuerySchema = z.object({
  hubId: z.uuid(),
  queue: z.enum(SHIPMENT_QUEUE).default(SHIPMENT_QUEUE.TO_BOOK),
  ...pageSchema,
});

export const listOrdersToPackQuerySchema = z.object({ hubId: z.uuid(), ...pageSchema });

export const shipmentIdParamSchema = z.object({ shipmentId: z.uuid() });

export const recordParcelEventSchema = z
  .object({
    code: z.enum(MANUAL_PARCEL_EVENT_CODES),
    rawStatus: z.string().trim().min(1).max(MAX_RAW_STATUS_LENGTH).optional(),
    reasonCode: z.enum(DeliveryFailureReason).optional(),
    occurredAt: z.coerce.date().optional(),
    note: z.string().trim().min(MIN_NOTE_LENGTH).max(MAX_NOTE_LENGTH),
    isCorrection: z.boolean().default(false),
  })
  .refine(({ occurredAt }) => occurredAt === undefined || !isFuture(occurredAt), {
    message: "The time can't be in the future.",
    path: ["occurredAt"],
  });

export type ListShipmentsQuery = z.infer<typeof listShipmentsQuerySchema>;
export type ListOrdersToPackQuery = z.infer<typeof listOrdersToPackQuerySchema>;
export type ShipmentIdParam = z.infer<typeof shipmentIdParamSchema>;
export type RecordParcelEventBody = z.infer<typeof recordParcelEventSchema>;
