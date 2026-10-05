import type {
  CommissionRecipientKind,
  CommissionScope,
  CommissionSource,
  CommissionStatus,
} from "@outfiqe/types";
import { z } from "zod";

const sourceValues = [
  "TAG_CLICK",
  "INTERNAL_LINK",
  "EXTERNAL_LINK",
  "OUTFIT_BUILD",
] satisfies CommissionSource[];
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

export const COMMISSION_SCOPE = {
  CREATOR_LOOK: "CREATOR_LOOK",
  OUTFIT_BUILD: "OUTFIT_BUILD",
} as const satisfies Record<string, CommissionScope>;
export const commissionScopeSchema = z.enum(COMMISSION_SCOPE);
export type CommissionScopeValue = z.infer<typeof commissionScopeSchema>;

const recipientKindValues = ["PERSON", "BRAND"] satisfies CommissionRecipientKind[];

const storedTierSchema = z.object({
  id: z.string(),
  scope: commissionScopeSchema,
  minPrice: z.number(),
  maxPrice: z.number().nullable(),
  amount: z.number(),
  sortOrder: z.number(),
});
export type StoredCommissionTier = z.infer<typeof storedTierSchema>;

export const commissionTierSchema = storedTierSchema.extend({
  overlapsWithTierIds: z.array(z.string()).default([]),
});
export type CommissionTier = z.infer<typeof commissionTierSchema>;

export const tierPriceTestSchema = z.object({
  price: z.number(),
  tierId: z.string().nullable(),
  amount: z.number(),
});
export type TierPriceTest = z.infer<typeof tierPriceTestSchema>;

export const tierChangeSchema = z.object({
  id: z.string(),
  action: z.string(),
  actorName: z.string().nullable(),
  summary: z.string(),
  before: storedTierSchema.nullable(),
  after: storedTierSchema.nullable(),
  createdAt: z.string(),
});
export type TierChange = z.infer<typeof tierChangeSchema>;

export const tierChangePageSchema = z.object({
  items: z.array(tierChangeSchema),
  nextCursor: z.string().nullable(),
});
export type TierChangePage = z.infer<typeof tierChangePageSchema>;

export const adminCommissionSchema = z.object({
  id: z.string(),
  recipientName: z.string(),
  recipientKind: z.enum(recipientKindValues),
  productName: z.string(),
  brandName: z.string(),
  source: commissionSourceSchema,
  status: commissionStatusSchema,
  amount: z.number(),
  createdAt: z.string(),
});
export type AdminCommission = z.infer<typeof adminCommissionSchema>;
