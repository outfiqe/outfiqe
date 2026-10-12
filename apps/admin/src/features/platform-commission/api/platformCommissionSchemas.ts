import type { PaymentMethod, PlatformFeeType } from "@outfiqe/types";
import { z } from "zod";

const feeTypeValues = ["FLAT", "PERCENT"] satisfies PlatformFeeType[];
export const feeTypeSchema = z.enum(feeTypeValues);
export type FeeTypeValue = z.infer<typeof feeTypeSchema>;

const gatewayPaymentMethodValues = ["ESEWA", "KHALTI"] satisfies PaymentMethod[];
export const gatewayPaymentMethodSchema = z.enum(gatewayPaymentMethodValues);
export type GatewayPaymentMethodValue = z.infer<typeof gatewayPaymentMethodSchema>;

export const platformCommissionTierSchema = z.object({
  id: z.string(),
  minPrice: z.number(),
  maxPrice: z.number().nullable(),
  feeType: feeTypeSchema,
  flatAmount: z.number().nullable(),
  ratePercent: z.number().nullable(),
});
export type PlatformCommissionTier = z.infer<typeof platformCommissionTierSchema>;

export const platformCommissionRuleSchema = z.object({
  id: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  tiers: z.array(platformCommissionTierSchema),
});
export type PlatformCommissionRule = z.infer<typeof platformCommissionRuleSchema>;

export const gatewayFeeRateSchema = z.object({
  id: z.string(),
  paymentMethod: gatewayPaymentMethodSchema,
  ratePercent: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
});
export type GatewayFeeRate = z.infer<typeof gatewayFeeRateSchema>;

export const brandCommissionExemptionSchema = z.object({
  id: z.string(),
  brandId: z.string(),
  brandName: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  reason: z.string(),
  createdAt: z.string(),
  revokedAt: z.string().nullable(),
});
export type BrandCommissionExemption = z.infer<typeof brandCommissionExemptionSchema>;

export const brandSearchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type BrandSearchResult = z.infer<typeof brandSearchResultSchema>;
