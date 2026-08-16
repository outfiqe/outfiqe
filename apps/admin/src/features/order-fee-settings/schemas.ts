import { z } from "zod";

const orderFeeValuesSchema = z.object({
  standardDeliveryFee: z.number(),
  freeDeliveryThreshold: z.number(),
  codHandlingFee: z.number(),
});
export type OrderFeeValues = z.infer<typeof orderFeeValuesSchema>;

export const orderFeeSettingsSchema = orderFeeValuesSchema.extend({ updatedAt: z.string() });
export type OrderFeeSettings = z.infer<typeof orderFeeSettingsSchema>;

export const orderFeeSettingsHistoryEntrySchema = z.object({
  id: z.string(),
  changedByName: z.string(),
  oldValues: orderFeeValuesSchema,
  newValues: orderFeeValuesSchema,
  createdAt: z.string(),
});
export type OrderFeeSettingsHistoryEntry = z.infer<typeof orderFeeSettingsHistoryEntrySchema>;
