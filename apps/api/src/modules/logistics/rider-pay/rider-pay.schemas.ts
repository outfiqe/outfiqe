import { isBefore } from "date-fns/isBefore";
import { subMinutes } from "date-fns/subMinutes";
import { z } from "zod";

import { PLATFORM_DEFAULT_COUNTRY_CODE } from "#constants/country.constants.js";
import { RiderEarningStatus } from "#generated/prisma/enums.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MAX_PAY_AMOUNT = 100_000;
const COUNTRY_CODE_LENGTH = 2;
const MIN_VOID_REASON_LENGTH = 5;
const MAX_VOID_REASON_LENGTH = 500;
const CLOCK_SKEW_ALLOWANCE_MINUTES = 5;

const payAmountSchema = z.number().int().min(0).max(MAX_PAY_AMOUNT);

const pageSchema = {
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
};

export const riderPayRatesQuerySchema = z.object({
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .length(COUNTRY_CODE_LENGTH)
    .default(PLATFORM_DEFAULT_COUNTRY_CODE),
});

export const createRiderPayRateSchema = z
  .object({
    countryCode: z.string().trim().toUpperCase().length(COUNTRY_CODE_LENGTH),
    visitAmount: payAmountSchema,
    extraStopAmount: payAmountSchema,
    wastedVisitAmount: payAmountSchema,
    effectiveFrom: z.coerce.date().optional(),
  })
  .refine(
    ({ effectiveFrom }) =>
      effectiveFrom === undefined ||
      !isBefore(effectiveFrom, subMinutes(new Date(), CLOCK_SKEW_ALLOWANCE_MINUTES)),
    {
      message: "A new rate can start now or later, never in the past.",
      path: ["effectiveFrom"],
    },
  );

export const riderPayRateParamSchema = z.object({ rateId: z.uuid() });

export const listRiderEarningsQuerySchema = z.object({
  riderId: z.uuid().optional(),
  status: z.enum(RiderEarningStatus).optional(),
  ...pageSchema,
});

export const listMyRiderEarningsQuerySchema = z.object(pageSchema);

export const riderEarningParamSchema = z.object({ earningId: z.uuid() });

export const voidRiderEarningSchema = z.object({
  reason: z.string().trim().min(MIN_VOID_REASON_LENGTH).max(MAX_VOID_REASON_LENGTH),
});

export type RiderPayRatesQuery = z.infer<typeof riderPayRatesQuerySchema>;
export type CreateRiderPayRateBody = z.infer<typeof createRiderPayRateSchema>;
export type RiderPayRateParam = z.infer<typeof riderPayRateParamSchema>;
export type ListRiderEarningsQuery = z.infer<typeof listRiderEarningsQuerySchema>;
export type ListMyRiderEarningsQuery = z.infer<typeof listMyRiderEarningsQuerySchema>;
export type RiderEarningParam = z.infer<typeof riderEarningParamSchema>;
export type VoidRiderEarningBody = z.infer<typeof voidRiderEarningSchema>;
