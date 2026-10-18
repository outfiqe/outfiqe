import { z } from "zod";

export const hubSchema = z.object({
  id: z.string(),
  name: z.string(),
  countryCode: z.string(),
  address: z.string(),
  city: z.string(),
  phone: z.string(),
  timeZone: z.string(),
  workingDays: z.array(z.number()),
  openTime: z.string(),
  closeTime: z.string(),
  pickupRoundTimes: z.array(z.string()),
  readyCutoffMinutes: z.number(),
  partnerCollectionTime: z.string(),
  isActive: z.boolean(),
  pickupZones: z.array(z.object({ id: z.string(), name: z.string() })),
});
export type Hub = z.infer<typeof hubSchema>;

export const hubListSchema = z.object({ hubs: z.array(hubSchema) });

export type HubRequestBody = Omit<Hub, "id" | "pickupZones">;
