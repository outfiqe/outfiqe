import { z } from "zod";

import { normalizeCityName } from "./deliveryZone.utils.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export const citySchema = z.string().trim().min(1).max(120);

const hasNoDuplicateCities = (cities: string[]) => {
  const normalized = cities.map(normalizeCityName);
  return new Set(normalized).size === normalized.length;
};

const citiesSchema = z
  .array(citySchema)
  .refine(hasNoDuplicateCities, { message: "Each city can only be listed once." });

const deliveryZoneFeeFields = {
  standardDeliveryFee: z.number().int().nonnegative(),
  freeDeliveryThreshold: z.number().int().nonnegative(),
  codHandlingFee: z.number().int().nonnegative(),
};

export const createDeliveryZoneSchema = z.object({
  name: z.string().trim().min(1).max(120),
  cities: citiesSchema.default([]),
  ...deliveryZoneFeeFields,
});

export const updateDeliveryZoneSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  cities: citiesSchema.optional(),
  standardDeliveryFee: deliveryZoneFeeFields.standardDeliveryFee.optional(),
  freeDeliveryThreshold: deliveryZoneFeeFields.freeDeliveryThreshold.optional(),
  codHandlingFee: deliveryZoneFeeFields.codHandlingFee.optional(),
});

export const deliveryZoneIdParamSchema = z.object({ zoneId: z.uuid() });

export const listDeliveryZoneHistoryQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type CreateDeliveryZoneBody = z.infer<typeof createDeliveryZoneSchema>;
export type UpdateDeliveryZoneBody = z.infer<typeof updateDeliveryZoneSchema>;
export type DeliveryZoneIdParam = z.infer<typeof deliveryZoneIdParamSchema>;
export type ListDeliveryZoneHistoryQuery = z.infer<typeof listDeliveryZoneHistoryQuerySchema>;
