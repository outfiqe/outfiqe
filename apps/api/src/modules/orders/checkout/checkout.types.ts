import type {
  GatewayFeeRateRecord,
  PlatformCommissionRuleRecord,
} from "#modules/brand-payouts/brand-payout.types.js";
import type {
  CommissionShare,
  CommissionTierRecord,
} from "#modules/commissions/commission.types.js";
import type { CouponValuation, CouponWithEligibility } from "#modules/coupons/coupon.types.js";

import type { AttributionCandidate } from "../order.attribution.utils.js";

export type CheckoutLine = {
  productId: string;
  sizeId: string;
  qty: number;
  listUnitPrice: number;
  brandId: string;
};

export type PricedCheckoutLine = CheckoutLine & {
  unitPrice: number;
  brandDiscountAmount: number;
  platformDiscountAmount: number;
};

export type CheckoutCouponResolution = {
  coupon: CouponWithEligibility;
  valuation: CouponValuation;
};

export type CheckoutPricing = {
  pricedLines: PricedCheckoutLine[];
  couponResolution: CheckoutCouponResolution | null;
  subtotal: number;
  brandDiscountTotal: number;
  platformDiscountTotal: number;
  deliveryFee: number;
  codFee: number;
  total: number;
};

export type CheckoutLineAttributions = {
  attributions: (AttributionCandidate | null)[];
  tiers: (CommissionTierRecord | null)[];
  commissionSharesByLine: CommissionShare[][];
};

export type CheckoutSettlementTerms = {
  commissionRule: PlatformCommissionRuleRecord;
  gatewayFeeRate: GatewayFeeRateRecord | null;
  exemptBrandIds: Set<string>;
};

export type CreatedCreatorCommission = {
  creatorId: string;
  orderItemId: string;
  amount: number;
};
