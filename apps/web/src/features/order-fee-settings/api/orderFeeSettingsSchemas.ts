import { z } from "zod";

export const orderFeeSettingsSchema = z.object({
  standardDeliveryFee: z.number(),
  freeDeliveryThreshold: z.number(),
  codHandlingFee: z.number(),
  updatedAt: z.string(),
});
export type OrderFeeSettings = z.infer<typeof orderFeeSettingsSchema>;
