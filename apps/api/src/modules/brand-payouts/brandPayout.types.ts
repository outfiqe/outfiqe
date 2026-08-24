import type { BrandPayoutStatus } from "#generated/prisma/enums.js";

export type PlatformCommissionRuleRecord = {
  id: string;
  ratePercentBasisPoints: number;
  isActive: boolean;
  createdAt: Date;
};

export type PlatformCommissionRuleView = {
  id: string;
  ratePercent: number;
  isActive: boolean;
  createdAt: string;
};

export type CreatePendingBrandPayoutInput = {
  orderItemId: string;
  brandId: string;
  commissionRuleId: string;
  grossAmount: number;
  platformFee: number;
  gatewayFee: number;
  netAmount: number;
};

export type BrandPayoutSummary = {
  totalPayouts: number;
  pending: number;
  available: number;
  withdrawn: number;
};

export type BrandPayoutView = {
  id: string;
  productName: string;
  imageUrl: string | null;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  status: BrandPayoutStatus;
  createdAt: string;
};
