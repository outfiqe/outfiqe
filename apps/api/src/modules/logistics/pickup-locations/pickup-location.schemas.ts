import { z } from "zod";

import { PLATFORM_DEFAULT_COUNTRY_CODE } from "#constants/country.constants.js";
import { countryCodeSchema } from "#lib/country.utils.js";

const MIN_LATITUDE = -90;
const MAX_LATITUDE = 90;
const MIN_LONGITUDE = -180;
const MAX_LONGITUDE = 180;

type CoordinatesInput = {
  latitude?: number | null;
  longitude?: number | null;
};

const hasBothOrNeitherCoordinate = ({ latitude, longitude }: CoordinatesInput) =>
  (latitude ?? null) === null ? (longitude ?? null) === null : (longitude ?? null) !== null;

export const pickupLocationBodySchema = z
  .object({
    label: z.string().trim().min(1).max(60),
    contactName: z.string().trim().min(1).max(80),
    contactPhone: z.string().trim().min(5).max(20),
    address: z.string().trim().min(1).max(200),
    landmark: z.string().trim().max(120).nullish(),
    city: z.string().trim().min(1).max(120),
    countryCode: countryCodeSchema.default(PLATFORM_DEFAULT_COUNTRY_CODE),
    latitude: z.number().min(MIN_LATITUDE).max(MAX_LATITUDE).nullish(),
    longitude: z.number().min(MIN_LONGITUDE).max(MAX_LONGITUDE).nullish(),
    openingNote: z.string().trim().max(200).nullish(),
  })
  .refine(hasBothOrNeitherCoordinate, {
    message: "Set both the latitude and the longitude of the map pin, or neither.",
    path: ["longitude"],
  });

export const pickupLocationIdParamSchema = z.object({ locationId: z.uuid() });

export type PickupLocationBody = z.infer<typeof pickupLocationBodySchema>;
export type PickupLocationIdParam = z.infer<typeof pickupLocationIdParamSchema>;
