import { z } from "zod";

import { paymentMethodSchema } from "@/features/orders/api/ordersSchemas";

export const PICKUP_STATUSES = [
  "AWAITING_BRAND",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "AT_HUB",
  "IN_PARCEL",
  "RETURN_AT_HUB",
  "RETURNING_TO_BRAND",
  "RETURNED_TO_BRAND",
  "CANCELLED",
] as const;
export const pickupStatusSchema = z.enum(PICKUP_STATUSES);
export type PickupStatusValue = z.infer<typeof pickupStatusSchema>;

export const SHIPMENT_STATUSES = [
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
export const shipmentStatusSchema = z.enum(SHIPMENT_STATUSES);
export type ShipmentStatusValue = z.infer<typeof shipmentStatusSchema>;

export const BOOKING_STATUSES = ["REQUESTED", "BOOKED", "BOOKING_FAILED", "CANCELLED"] as const;
export const bookingStatusSchema = z.enum(BOOKING_STATUSES);

export const INSPECTION_STATUSES = ["NOT_INSPECTED", "PASSED", "FAILED"] as const;

export const pickupCheckInSchema = z.object({
  fulfilmentGroupId: z.string(),
  orderId: z.string(),
  brandName: z.string(),
  pickupStatus: pickupStatusSchema.nullable(),
  expectedUnits: z.number(),
  countedUnits: z.number(),
  hasCountMismatch: z.boolean(),
});
export type PickupCheckIn = z.infer<typeof pickupCheckInSchema>;

export const BOOKING_CONNECTIONS = ["API", "MANUAL"] as const;
export const bookingConnectionSchema = z.enum(BOOKING_CONNECTIONS);

export const parcelBookingSchema = z.object({
  bookingId: z.string(),
  partnerId: z.string(),
  partnerName: z.string(),
  status: bookingStatusSchema,
  connection: bookingConnectionSchema,
  merchantReference: z.string(),
  partnerReference: z.string().nullable(),
  partnerTrackingUrl: z.string().nullable(),
  failureReason: z.string().nullable(),
});
export type ParcelBooking = z.infer<typeof parcelBookingSchema>;

export const orderToPackSchema = z.object({
  orderId: z.string(),
  placedAt: z.string(),
  customerName: z.string(),
  city: z.string(),
  paymentMethod: paymentMethodSchema,
  pickupsStillComing: z.number(),
  pickupsAtHub: z.array(
    z.object({
      fulfilmentGroupId: z.string(),
      brandName: z.string(),
      isInspected: z.boolean(),
      items: z.array(
        z.object({
          orderItemId: z.string(),
          productName: z.string(),
          sizeLabel: z.string(),
          units: z.number(),
          inspectionStatus: z.enum(INSPECTION_STATUSES),
          failedQty: z.number(),
        }),
      ),
    }),
  ),
  otherPickups: z.array(
    z.object({
      fulfilmentGroupId: z.string(),
      brandName: z.string(),
      pickupStatus: pickupStatusSchema.nullable(),
    }),
  ),
});
export type OrderToPack = z.infer<typeof orderToPackSchema>;
export type PickupAtHub = OrderToPack["pickupsAtHub"][number];

export const ordersToPackPageSchema = z.object({
  items: z.array(orderToPackSchema),
  nextCursor: z.string().nullable(),
});
export type OrdersToPackPage = z.infer<typeof ordersToPackPageSchema>;

export const pickupInspectionSchema = z.object({
  fulfilmentGroupId: z.string(),
  orderId: z.string(),
  failedUnits: z.number(),
  refundId: z.string().nullable(),
  pickupStatus: pickupStatusSchema.nullable(),
});

export const packedParcelSchema = z.object({
  shipmentId: z.string(),
  trackingCode: z.string(),
  status: shipmentStatusSchema,
  codAmountToCollect: z.number(),
  fulfilmentGroupIds: z.array(z.string()),
  booking: parcelBookingSchema.nullable(),
});
export type PackedParcel = z.infer<typeof packedParcelSchema>;

export const parcelHandoverSchema = z.object({
  shipmentId: z.string(),
  trackingCode: z.string(),
  status: shipmentStatusSchema,
});
export type ParcelHandover = z.infer<typeof parcelHandoverSchema>;

export type CheckInPickupBody = { hubId: string; code: string; countedUnits: number };
export type InspectionLine = { orderItemId: string; failedQty: number };
export type PackParcelBody = {
  partnerId: string | null;
  weightGrams: number;
  parcelCount: number;
  packsOnlyPickupsAtHub: boolean;
};
