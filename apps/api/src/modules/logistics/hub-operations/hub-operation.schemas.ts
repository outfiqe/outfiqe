import { z } from "zod";

const MAX_SCANNED_CODE_LENGTH = 40;
const MAX_COUNTED_UNITS = 500;
const MAX_INSPECTION_LINES = 100;
const MIN_NOTE_LENGTH = 3;
const MAX_NOTE_LENGTH = 500;
const MAX_PARCEL_WEIGHT_GRAMS = 50_000;
const MAX_PACKAGES_PER_PARCEL = 10;
const MAX_PARTNER_REFERENCE_LENGTH = 80;

const scannedCodeSchema = z.string().trim().min(1).max(MAX_SCANNED_CODE_LENGTH);
const noteSchema = z.string().trim().min(MIN_NOTE_LENGTH).max(MAX_NOTE_LENGTH);

export const checkInPickupSchema = z.object({
  hubId: z.uuid(),
  code: scannedCodeSchema,
  countedUnits: z.number().int().min(0).max(MAX_COUNTED_UNITS),
});

export const fulfilmentGroupIdParamSchema = z.object({ groupId: z.uuid() });

export const recordInspectionSchema = z.object({
  lines: z
    .array(z.object({ orderItemId: z.uuid(), failedQty: z.number().int().min(0) }))
    .min(1)
    .max(MAX_INSPECTION_LINES),
  note: noteSchema.optional(),
});

export const orderIdParamSchema = z.object({ orderId: z.uuid() });

export const packParcelSchema = z.object({
  partnerId: z.uuid().nullable().default(null),
  weightGrams: z.number().int().min(1).max(MAX_PARCEL_WEIGHT_GRAMS),
  parcelCount: z.number().int().min(1).max(MAX_PACKAGES_PER_PARCEL),
  packsOnlyPickupsAtHub: z.boolean().default(false),
});

export const shipmentIdParamSchema = z.object({ shipmentId: z.uuid() });

export const recordManualBookingSchema = z.object({
  partnerReference: z.string().trim().min(1).max(MAX_PARTNER_REFERENCE_LENGTH),
});

export const handOverParcelSchema = z.object({
  hubId: z.uuid(),
  code: scannedCodeSchema,
});

export const rebookParcelSchema = z.object({
  partnerId: z.uuid(),
  reason: noteSchema,
});

export type CheckInPickupBody = z.infer<typeof checkInPickupSchema>;
export type FulfilmentGroupIdParam = z.infer<typeof fulfilmentGroupIdParamSchema>;
export type RecordInspectionBody = z.infer<typeof recordInspectionSchema>;
export type OrderIdParam = z.infer<typeof orderIdParamSchema>;
export type PackParcelBody = z.infer<typeof packParcelSchema>;
export type ShipmentIdParam = z.infer<typeof shipmentIdParamSchema>;
export type RecordManualBookingBody = z.infer<typeof recordManualBookingSchema>;
export type HandOverParcelBody = z.infer<typeof handOverParcelSchema>;
export type RebookParcelBody = z.infer<typeof rebookParcelSchema>;
