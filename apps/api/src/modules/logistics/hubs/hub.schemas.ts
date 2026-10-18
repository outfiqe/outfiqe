import { z } from "zod";

import { countryCodeSchema, isValidTimeZone } from "#lib/country.utils.js";

const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const FIRST_WEEKDAY = 0;
const LAST_WEEKDAY = 6;
const DAYS_IN_WEEK = 7;
const MAX_PICKUP_ROUNDS_PER_DAY = 8;
const MAX_READY_CUTOFF_MINUTES = 240;
const MAX_PICKUP_ZONES_PER_HUB = 200;

const timeOfDaySchema = z
  .string()
  .regex(TIME_OF_DAY_PATTERN, "Use the 24-hour HH:mm format, for example 09:30.");

const hasNoDuplicates = <Value>(values: readonly Value[]) => new Set(values).size === values.length;

type HubScheduleInput = {
  openTime: string;
  closeTime: string;
  pickupRoundTimes: string[];
  partnerCollectionTime: string;
};

const isWithinOpeningHours = (time: string, { openTime, closeTime }: HubScheduleInput) =>
  time >= openTime && time <= closeTime;

export const hubBodySchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    countryCode: countryCodeSchema,
    address: z.string().trim().min(1).max(200),
    city: z.string().trim().min(1).max(120),
    phone: z.string().trim().min(5).max(20),
    timeZone: z.string().refine(isValidTimeZone, "That isn't a known time zone."),
    workingDays: z
      .array(z.number().int().min(FIRST_WEEKDAY).max(LAST_WEEKDAY))
      .min(1)
      .max(DAYS_IN_WEEK)
      .refine(hasNoDuplicates, "Each working day can only be listed once."),
    openTime: timeOfDaySchema,
    closeTime: timeOfDaySchema,
    pickupRoundTimes: z
      .array(timeOfDaySchema)
      .min(1)
      .max(MAX_PICKUP_ROUNDS_PER_DAY)
      .refine(hasNoDuplicates, "Each pickup round time can only be listed once."),
    readyCutoffMinutes: z.number().int().min(0).max(MAX_READY_CUTOFF_MINUTES),
    partnerCollectionTime: timeOfDaySchema,
    isActive: z.boolean().default(true),
  })
  .refine((hub) => hub.openTime < hub.closeTime, {
    message: "The hub must open before it closes.",
    path: ["closeTime"],
  })
  .refine((hub) => hub.pickupRoundTimes.every((time) => isWithinOpeningHours(time, hub)), {
    message: "Every pickup round must be within the hub's opening hours.",
    path: ["pickupRoundTimes"],
  })
  .refine((hub) => isWithinOpeningHours(hub.partnerCollectionTime, hub), {
    message: "Partner collection must be within the hub's opening hours.",
    path: ["partnerCollectionTime"],
  });

export const hubIdParamSchema = z.object({ hubId: z.uuid() });

export const setHubPickupZonesSchema = z.object({
  deliveryZoneIds: z
    .array(z.uuid())
    .max(MAX_PICKUP_ZONES_PER_HUB)
    .refine(hasNoDuplicates, "Each zone can only be listed once."),
});

export type HubBody = z.infer<typeof hubBodySchema>;
export type HubIdParam = z.infer<typeof hubIdParamSchema>;
export type SetHubPickupZonesBody = z.infer<typeof setHubPickupZonesSchema>;
