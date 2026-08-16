import { z } from "zod";

export const deliveryZoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  isDefault: z.boolean(),
  cities: z.array(z.string()),
  standardDeliveryFee: z.number(),
  freeDeliveryThreshold: z.number(),
  codHandlingFee: z.number(),
  updatedAt: z.string(),
});
export type DeliveryZone = z.infer<typeof deliveryZoneSchema>;
