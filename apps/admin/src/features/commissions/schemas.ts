import type { CommissionSource, CommissionStatus } from "@outfiqe/types";
import { z } from "zod";

const sourceValues = ["TAG_CLICK", "INTERNAL_LINK", "EXTERNAL_LINK"] satisfies CommissionSource[];
export const commissionSourceSchema = z.enum(sourceValues);
export type CommissionSourceValue = z.infer<typeof commissionSourceSchema>;

const statusValues = [
  "PENDING",
  "APPROVED",
  "AVAILABLE",
  "PAID",
  "VOIDED",
] satisfies CommissionStatus[];
export const commissionStatusSchema = z.enum(statusValues);
export type CommissionStatusValue = z.infer<typeof commissionStatusSchema>;

export const commissionTierSchema = z.object({
  id: z.string(),
  minPrice: z.number(),
  maxPrice: z.number().nullable(),
  amount: z.number(),
  sortOrder: z.number(),
});
export type CommissionTier = z.infer<typeof commissionTierSchema>;

export const adminCommissionSchema = z.object({
  id: z.string(),
  creatorName: z.string(),
  productName: z.string(),
  brandName: z.string(),
  source: commissionSourceSchema,
  status: commissionStatusSchema,
  amount: z.number(),
  createdAt: z.string(),
});
export type AdminCommission = z.infer<typeof adminCommissionSchema>;
