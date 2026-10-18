import { z } from "zod";

export const RIDER_EARNING_STATUSES = ["PENDING", "AVAILABLE", "WITHDRAWN", "VOIDED"] as const;
export const riderEarningStatusSchema = z.enum(RIDER_EARNING_STATUSES);
export type RiderEarningStatus = z.infer<typeof riderEarningStatusSchema>;

export const riderPayRateSchema = z.object({
  id: z.string(),
  countryCode: z.string(),
  currency: z.string(),
  visitAmount: z.number(),
  extraStopAmount: z.number(),
  wastedVisitAmount: z.number(),
  effectiveFrom: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  createdByName: z.string().nullable(),
});
export type RiderPayRate = z.infer<typeof riderPayRateSchema>;

export const riderPayRatesSchema = z.object({
  countryCode: z.string(),
  currency: z.string(),
  rateInEffect: z.object({
    visitAmount: z.number(),
    extraStopAmount: z.number(),
    wastedVisitAmount: z.number(),
    isDefault: z.boolean(),
  }),
  rates: z.array(riderPayRateSchema),
});
export type RiderPayRates = z.infer<typeof riderPayRatesSchema>;

export const riderEarningSchema = z.object({
  id: z.string(),
  riderId: z.string(),
  riderName: z.string(),
  riderTaskId: z.string(),
  brandName: z.string(),
  pickupLocationLabel: z.string(),
  kind: z.enum(["VISIT", "WASTED_VISIT"]),
  currency: z.string(),
  stopCount: z.number(),
  amount: z.number(),
  status: riderEarningStatusSchema,
  earnedAt: z.string(),
  releasesAt: z.string(),
  voidReason: z.string().nullable(),
});
export type RiderEarning = z.infer<typeof riderEarningSchema>;

export const riderEarningPageSchema = z.object({
  items: z.array(riderEarningSchema),
  nextCursor: z.string().nullable(),
});
export type RiderEarningPage = z.infer<typeof riderEarningPageSchema>;

export type CreateRiderPayRateBody = {
  countryCode: string;
  visitAmount: number;
  extraStopAmount: number;
  wastedVisitAmount: number;
  effectiveFrom?: string;
};
