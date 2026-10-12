import { z } from "zod";

import { PaymentMethod, PlatformFeeType } from "#generated/prisma/enums.js";

const RATE_PERCENT_MAX = 100;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const TIER_LADDER_FLOOR_PRICE = 0;
const REASON_MAX = 300;

const platformCommissionTierInputSchema = z
  .object({
    minPrice: z.number().int().nonnegative(),
    maxPrice: z.number().int().positive().nullable(),
    feeType: z.enum(PlatformFeeType),
    flatAmount: z.number().int().positive().optional(),
    ratePercent: z.number().positive().max(RATE_PERCENT_MAX).optional(),
  })
  .refine(
    (tier) =>
      tier.feeType === PlatformFeeType.FLAT
        ? tier.flatAmount !== undefined && tier.ratePercent === undefined
        : tier.ratePercent !== undefined && tier.flatAmount === undefined,
    {
      message: "A FLAT tier needs only flatAmount; a PERCENT tier needs only ratePercent.",
      path: ["feeType"],
    },
  );

export const createPlatformCommissionRuleSchema = z
  .object({ tiers: z.array(platformCommissionTierInputSchema).min(1) })
  .refine(
    (body) => {
      const sortedTiers = [...body.tiers].sort((a, b) => a.minPrice - b.minPrice);
      const firstTier = sortedTiers[0];
      const lastTier = sortedTiers[sortedTiers.length - 1];
      if (!firstTier || !lastTier) return false;
      if (firstTier.minPrice !== TIER_LADDER_FLOOR_PRICE) return false;
      if (lastTier.maxPrice !== null) return false;

      for (let index = 0; index < sortedTiers.length - 1; index += 1) {
        const currentTier = sortedTiers[index];
        const nextTier = sortedTiers[index + 1];
        if (currentTier?.maxPrice !== nextTier?.minPrice) return false;
      }
      return true;
    },
    {
      message:
        "Tiers must be contiguous starting at 0 with no gaps or overlaps, and the highest tier must be open-ended.",
      path: ["tiers"],
    },
  );
export type CreatePlatformCommissionRuleBody = z.infer<typeof createPlatformCommissionRuleSchema>;

const gatewayPaymentMethodSchema = z.enum([PaymentMethod.ESEWA, PaymentMethod.KHALTI]);

export const createGatewayFeeRateSchema = z.object({
  paymentMethod: gatewayPaymentMethodSchema,
  ratePercent: z.number().nonnegative().max(RATE_PERCENT_MAX),
});
export type CreateGatewayFeeRateBody = z.infer<typeof createGatewayFeeRateSchema>;

export const createBrandCommissionExemptionSchema = z
  .object({
    brandId: z.uuid(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    reason: z.string().trim().min(1).max(REASON_MAX),
  })
  .refine((body) => body.endsAt > body.startsAt, {
    message: "endsAt must be after startsAt.",
    path: ["endsAt"],
  });
export type CreateBrandCommissionExemptionBody = z.infer<
  typeof createBrandCommissionExemptionSchema
>;

export const listBrandCommissionExemptionsQuerySchema = z.object({
  brandId: z.uuid().optional(),
});
export type ListBrandCommissionExemptionsQuery = z.infer<
  typeof listBrandCommissionExemptionsQuerySchema
>;

export const exemptionIdParamSchema = z.object({ id: z.uuid() });
export type ExemptionIdParam = z.infer<typeof exemptionIdParamSchema>;

export const listBrandPayoutsQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type ListBrandPayoutsQuery = z.infer<typeof listBrandPayoutsQuerySchema>;
