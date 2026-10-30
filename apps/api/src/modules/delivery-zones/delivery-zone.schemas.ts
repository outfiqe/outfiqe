import { z } from "zod";

import { PLATFORM_DEFAULT_COUNTRY_CODE } from "#constants/country.constants.js";
import { normalizeCityName } from "#lib/city.utils.js";
import { countryCodeSchema } from "#lib/country.utils.js";

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

const MAX_DELIVERY_DAYS = 60;

const deliveryZoneFeeFields = {
  standardDeliveryFee: z.number().int().nonnegative(),
  freeDeliveryThreshold: z.number().int().nonnegative(),
  codHandlingFee: z.number().int().nonnegative(),
};

const deliveryDaysSchema = z.number().int().min(0).max(MAX_DELIVERY_DAYS).nullable();

type DeliveryDaysInput = {
  minDeliveryDays?: number | null;
  maxDeliveryDays?: number | null;
};

const DELIVERY_DAYS_RULE_MESSAGE =
  "Set both the shortest and longest delivery days, with the shortest no more than the longest, or leave both empty.";

const hasConsistentDeliveryDays = ({ minDeliveryDays, maxDeliveryDays }: DeliveryDaysInput) => {
  const areBothLeftOut = minDeliveryDays === undefined && maxDeliveryDays === undefined;
  const areBothCleared = minDeliveryDays === null && maxDeliveryDays === null;
  return (
    areBothLeftOut ||
    areBothCleared ||
    (typeof minDeliveryDays === "number" &&
      typeof maxDeliveryDays === "number" &&
      minDeliveryDays <= maxDeliveryDays)
  );
};

export const createDeliveryZoneSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    countryCode: countryCodeSchema.default(PLATFORM_DEFAULT_COUNTRY_CODE),
    cities: citiesSchema.default([]),
    ...deliveryZoneFeeFields,
    minDeliveryDays: deliveryDaysSchema.default(null),
    maxDeliveryDays: deliveryDaysSchema.default(null),
  })
  .refine(hasConsistentDeliveryDays, { message: DELIVERY_DAYS_RULE_MESSAGE });

export const updateDeliveryZoneSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    cities: citiesSchema.optional(),
    standardDeliveryFee: deliveryZoneFeeFields.standardDeliveryFee.optional(),
    freeDeliveryThreshold: deliveryZoneFeeFields.freeDeliveryThreshold.optional(),
    codHandlingFee: deliveryZoneFeeFields.codHandlingFee.optional(),
    minDeliveryDays: deliveryDaysSchema.optional(),
    maxDeliveryDays: deliveryDaysSchema.optional(),
  })
  .refine(hasConsistentDeliveryDays, { message: DELIVERY_DAYS_RULE_MESSAGE });

export const estimateDeliveryQuerySchema = z.object({ city: citySchema });

export const deliveryZoneIdParamSchema = z.object({ zoneId: z.uuid() });

export const listDeliveryZoneHistoryQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

const CITY_SEARCH_DEFAULT_LIMIT = 20;
const CITY_SEARCH_MAX_LIMIT = 50;

export const searchDeliveryZoneCitiesQuerySchema = z.object({
  q: citySchema,
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(CITY_SEARCH_MAX_LIMIT)
    .default(CITY_SEARCH_DEFAULT_LIMIT),
});

export type CreateDeliveryZoneBody = z.infer<typeof createDeliveryZoneSchema>;
export type UpdateDeliveryZoneBody = z.infer<typeof updateDeliveryZoneSchema>;
export type DeliveryZoneIdParam = z.infer<typeof deliveryZoneIdParamSchema>;
export type ListDeliveryZoneHistoryQuery = z.infer<typeof listDeliveryZoneHistoryQuerySchema>;
export type SearchDeliveryZoneCitiesQuery = z.infer<typeof searchDeliveryZoneCitiesQuerySchema>;
export type EstimateDeliveryQuery = z.infer<typeof estimateDeliveryQuerySchema>;
