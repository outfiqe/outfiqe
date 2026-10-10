import { z } from "zod";

const deliveryZoneFeeValuesSchema = z.object({
  standardDeliveryFee: z.number(),
  freeDeliveryThreshold: z.number(),
  codHandlingFee: z.number(),
});

export const deliveryZoneSchema = deliveryZoneFeeValuesSchema.extend({
  id: z.string(),
  name: z.string(),
  isDefault: z.boolean(),
  cities: z.array(z.string()),
  updatedAt: z.string(),
});
export type DeliveryZone = z.infer<typeof deliveryZoneSchema>;

const deliveryZoneSnapshotSchema = deliveryZoneFeeValuesSchema.extend({
  name: z.string(),
  isDefault: z.boolean(),
  cities: z.array(z.string()),
});

export const deliveryZoneHistoryEntrySchema = z.object({
  id: z.string(),
  zoneName: z.string(),
  changedByName: z.string(),
  oldValues: deliveryZoneSnapshotSchema,
  newValues: deliveryZoneSnapshotSchema,
  createdAt: z.string(),
});
export type DeliveryZoneHistoryEntry = z.infer<typeof deliveryZoneHistoryEntrySchema>;
