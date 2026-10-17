import { z } from "zod";

export const PICKUP_STATUS = [
  "AWAITING_BRAND",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "AT_HUB",
  "IN_PARCEL",
  "CANCELLED",
  "RETURN_AT_HUB",
  "RETURNING_TO_BRAND",
  "RETURNED_TO_BRAND",
] as const;
export const pickupStatusSchema = z.enum(PICKUP_STATUS);
export type PickupStatusValue = z.infer<typeof pickupStatusSchema>;

export const FULFILMENT_MODE = ["BRAND_SHIPS", "OUTFIQE_LOGISTICS"] as const;
export const fulfilmentModeSchema = z.enum(FULFILMENT_MODE);
export type FulfilmentModeValue = z.infer<typeof fulfilmentModeSchema>;

export const brandPickupSchema = z.object({
  fulfilmentGroupId: z.string(),
  pickupStatus: pickupStatusSchema,
  pickupCode: z.string(),
  readyForPickupAt: z.string().nullable(),
});
export type BrandPickup = z.infer<typeof brandPickupSchema>;
