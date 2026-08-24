import type { BrandPayoutStatus, CommissionStatus } from "@outfiqe/types";
import { z } from "zod";

export const rollupRangeSchema = z.enum(["cycle", "30d", "all"]);
export type RollupRange = z.infer<typeof rollupRangeSchema>;

const brandPayoutStatusValues = [
  "PENDING",
  "AVAILABLE",
  "WITHDRAWN",
  "VOIDED",
] satisfies BrandPayoutStatus[];
const commissionStatusValues = [
  "PENDING",
  "APPROVED",
  "AVAILABLE",
  "PAID",
  "VOIDED",
] satisfies CommissionStatus[];

export const financialRollupSchema = z.object({
  range: rollupRangeSchema,
  gateway: z.object({
    grossCollected: z.number(),
    refunded: z.number(),
    netHeld: z.number(),
  }),
  ledger: z.object({
    owedToBrands: z.partialRecord(z.enum(brandPayoutStatusValues), z.number()),
    owedToCreators: z.partialRecord(z.enum(commissionStatusValues), z.number()),
    platformRevenueRealized: z.number(),
  }),
});
export type FinancialRollup = z.infer<typeof financialRollupSchema>;
