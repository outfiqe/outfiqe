import type { BrandPayoutStatus } from "#generated/prisma/enums.js";

import { BASIS_POINTS_PER_PERCENT } from "./brandPayout.constants.js";
import type {
  BrandPayoutView,
  PlatformCommissionRuleRecord,
  PlatformCommissionRuleView,
} from "./brandPayout.types.js";

const BASIS_POINTS_DIVISOR = BASIS_POINTS_PER_PERCENT * 100;

export const computePlatformFee = (grossAmount: number, ratePercentBasisPoints: number): number =>
  Math.round((grossAmount * ratePercentBasisPoints) / BASIS_POINTS_DIVISOR);

export const toPlatformCommissionRuleView = (
  rule: PlatformCommissionRuleRecord,
): PlatformCommissionRuleView => ({
  id: rule.id,
  ratePercent: rule.ratePercentBasisPoints / BASIS_POINTS_PER_PERCENT,
  isActive: rule.isActive,
  createdAt: rule.createdAt.toISOString(),
});

type BrandPayoutRow = {
  id: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  status: BrandPayoutStatus;
  createdAt: Date;
  orderItem: { product: { name: string; imageUrl: string | null } };
};

export const toBrandPayoutView = (row: BrandPayoutRow): BrandPayoutView => ({
  id: row.id,
  productName: row.orderItem.product.name,
  imageUrl: row.orderItem.product.imageUrl,
  grossAmount: row.grossAmount,
  platformFee: row.platformFee,
  netAmount: row.netAmount,
  status: row.status,
  createdAt: row.createdAt.toISOString(),
});
