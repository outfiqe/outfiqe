import type {
  BrandPayoutStatus,
  CommissionStatus,
  PaymentMethod,
} from "#generated/prisma/enums.js";

export type FinancialRollupRange = "cycle" | "30d" | "all";

export type PaymentMethodOrderTotals = {
  paymentMethod: PaymentMethod;
  total: number;
  orderCount: number;
};

export type PaymentMethodPayoutFees = {
  paymentMethod: PaymentMethod;
  platformFee: number;
  gatewayFee: number;
};

export type PaymentMethodBreakdown = {
  gmv: number;
  orderCount: number;
  realizedTakeRate: number;
};

export type FinancialRollupView = {
  range: FinancialRollupRange;
  gateway: {
    grossCollected: number;
    refunded: number;
    netHeld: number;
  };
  ledger: {
    owedToBrands: number;
    owedToCreators: number;
    brandPayoutsByStatus: Partial<Record<BrandPayoutStatus, number>>;
    creatorCommissionsByStatus: Partial<Record<CommissionStatus, number>>;
    platformRevenueRealized: number;
    couponSpend: number;
    netPlatformRevenue: number;
  };
  byPaymentMethod: Partial<Record<PaymentMethod, PaymentMethodBreakdown>>;
};
