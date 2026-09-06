import { BASIS_POINTS_PER_PERCENT } from "#constants/money.constants.js";
import {
  type BrandPayoutStatus,
  type PaymentMethod,
  PlatformFeeType,
} from "#generated/prisma/enums.js";

import type {
  BrandCommissionExemptionRecord,
  BrandCommissionExemptionView,
  BrandPayoutView,
  GatewayFeeRateRecord,
  GatewayFeeRateView,
  PlatformCommissionRuleRecord,
  PlatformCommissionRuleView,
  PlatformCommissionTierRecord,
  PlatformCommissionTierView,
} from "./brandPayout.types.js";

const BASIS_POINTS_DIVISOR = BASIS_POINTS_PER_PERCENT * 100;
const NO_GATEWAY_FEE = 0;

export const computeTieredPlatformFee = (
  grossAmount: number,
  tiers: PlatformCommissionTierRecord[],
): { fee: number; tierId: string } => {
  const matchedTier = tiers.find(
    (tier) =>
      tier.minPrice <= grossAmount && (tier.maxPrice === null || grossAmount <= tier.maxPrice),
  );
  if (!matchedTier) {
    throw new Error(`No platform commission tier matches gross amount ${grossAmount}.`);
  }

  const fee =
    matchedTier.feeType === PlatformFeeType.FLAT
      ? (matchedTier.flatAmount ?? 0)
      : Math.round(
          (grossAmount * (matchedTier.ratePercentBasisPoints ?? 0)) / BASIS_POINTS_DIVISOR,
        );

  return { fee, tierId: matchedTier.id };
};

export const computeGatewayFee = (
  grossAmount: number,
  paymentMethod: PaymentMethod,
  rate: GatewayFeeRateRecord | null,
): number => {
  if (paymentMethod === "COD") return NO_GATEWAY_FEE;
  if (!rate) {
    throw new Error(`No active gateway fee rate configured for ${paymentMethod}.`);
  }
  return Math.round((grossAmount * rate.ratePercentBasisPoints) / BASIS_POINTS_DIVISOR);
};

export const toPlatformCommissionTierView = (
  tier: PlatformCommissionTierRecord,
): PlatformCommissionTierView => ({
  id: tier.id,
  minPrice: tier.minPrice,
  maxPrice: tier.maxPrice,
  feeType: tier.feeType,
  flatAmount: tier.flatAmount,
  ratePercent:
    tier.ratePercentBasisPoints === null
      ? null
      : tier.ratePercentBasisPoints / BASIS_POINTS_PER_PERCENT,
});

export const toPlatformCommissionRuleView = (
  rule: PlatformCommissionRuleRecord,
): PlatformCommissionRuleView => ({
  id: rule.id,
  isActive: rule.isActive,
  createdAt: rule.createdAt.toISOString(),
  tiers: rule.tiers.map(toPlatformCommissionTierView),
});

export const toGatewayFeeRateView = (rate: GatewayFeeRateRecord): GatewayFeeRateView => ({
  id: rate.id,
  paymentMethod: rate.paymentMethod,
  ratePercent: rate.ratePercentBasisPoints / BASIS_POINTS_PER_PERCENT,
  isActive: rate.isActive,
  createdAt: rate.createdAt.toISOString(),
});

export const toBrandCommissionExemptionView = (
  row: BrandCommissionExemptionRecord,
): BrandCommissionExemptionView => ({
  id: row.id,
  brandId: row.brandId,
  brandName: row.brandName,
  startsAt: row.startsAt.toISOString(),
  endsAt: row.endsAt.toISOString(),
  reason: row.reason,
  createdAt: row.createdAt.toISOString(),
  revokedAt: row.revokedAt?.toISOString() ?? null,
});

type BrandPayoutRow = {
  id: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  status: BrandPayoutStatus;
  createdAt: Date;
  orderItem: {
    platformDiscountAmount: number;
    product: { name: string; imageUrl: string | null };
  };
};

export const toBrandPayoutView = (row: BrandPayoutRow): BrandPayoutView => ({
  id: row.id,
  productName: row.orderItem.product.name,
  imageUrl: row.orderItem.product.imageUrl,
  grossAmount: row.grossAmount,
  platformFee: row.platformFee,
  netAmount: row.netAmount,
  status: row.status,
  platformFundedDiscountApplied: row.orderItem.platformDiscountAmount > 0,
  createdAt: row.createdAt.toISOString(),
});
