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

export const deliveryZoneCityMatchSchema = z.object({
  city: z.string(),
  zoneId: z.string(),
  zoneName: z.string(),
  isDefault: z.boolean(),
  standardDeliveryFee: z.number(),
  freeDeliveryThreshold: z.number(),
  codHandlingFee: z.number(),
});
export type DeliveryZoneCityMatch = z.infer<typeof deliveryZoneCityMatchSchema>;

export const deliveryZoneCitySearchResultSchema = z.object({
  cities: z.array(deliveryZoneCityMatchSchema),
});
export type DeliveryZoneCitySearchResult = z.infer<typeof deliveryZoneCitySearchResultSchema>;
