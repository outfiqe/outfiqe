import type { BrandPayoutStatus, PaymentMethod, PlatformFeeType } from "#generated/prisma/enums.js";

export type PlatformCommissionTierRecord = {
  id: string;
  minPrice: number;
  maxPrice: number | null;
  feeType: PlatformFeeType;
  flatAmount: number | null;
  ratePercentBasisPoints: number | null;
  sortOrder: number;
};

export type PlatformCommissionTierView = {
  id: string;
  minPrice: number;
  maxPrice: number | null;
  feeType: PlatformFeeType;
  flatAmount: number | null;
  ratePercent: number | null;
};

export type PlatformCommissionRuleRecord = {
  id: string;
  isActive: boolean;
  createdAt: Date;
  tiers: PlatformCommissionTierRecord[];
};

export type PlatformCommissionRuleView = {
  id: string;
  isActive: boolean;
  createdAt: string;
  tiers: PlatformCommissionTierView[];
};

export type PlatformCommissionTierInput = {
  minPrice: number;
  maxPrice: number | null;
  feeType: PlatformFeeType;
  flatAmount: number | null;
  ratePercentBasisPoints: number | null;
};

export type GatewayFeeRateRecord = {
  id: string;
  paymentMethod: PaymentMethod;
  ratePercentBasisPoints: number;
  isActive: boolean;
  createdAt: Date;
};

export type GatewayFeeRateView = {
  id: string;
  paymentMethod: PaymentMethod;
  ratePercent: number;
  isActive: boolean;
  createdAt: string;
};

export type BrandCommissionExemptionRecord = {
  id: string;
  brandId: string;
  brandName: string;
  startsAt: Date;
  endsAt: Date;
  reason: string;
  createdAt: Date;
  revokedAt: Date | null;
};

export type BrandCommissionExemptionView = {
  id: string;
  brandId: string;
  brandName: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  createdAt: string;
  revokedAt: string | null;
};

export type CreatePendingBrandPayoutInput = {
  orderItemId: string;
  brandId: string;
  commissionRuleId: string;
  platformCommissionTierId: string | null;
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
