import { z } from "zod";

export const pickupLocationSchema = z.object({
  id: z.string(),
  label: z.string(),
  contactName: z.string(),
  contactPhone: z.string(),
  address: z.string(),
  landmark: z.string().nullable(),
  city: z.string(),
  countryCode: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  openingNote: z.string().nullable(),
  isDefault: z.boolean(),
  isCoveredByOutfiqePickup: z.boolean(),
});
export type PickupLocation = z.infer<typeof pickupLocationSchema>;

export const pickupLocationListSchema = z.object({
  pickupLocations: z.array(pickupLocationSchema),
});

export type PickupLocationRequestBody = {
  label: string;
  contactName: string;
  contactPhone: string;
  address: string;
  landmark: string | null;
  city: string;
  latitude: number | null;
  longitude: number | null;
  openingNote: string | null;
};
