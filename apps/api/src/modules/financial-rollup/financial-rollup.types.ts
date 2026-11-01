import type {
  BrandPayoutStatus,
  CommissionStatus,
  FulfilmentStatus,
  PaymentMethod,
  PaymentStatus,
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

export type AttributionCounts = {
  totalItems: number;
  attributedItems: number;
};

export type AttributionView = {
  totalItems: number;
  attributedItems: number;
  attributedShare: number;
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
  attribution: AttributionView;
};

export type PaidOrderMoneyTotals = {
  collected: number;
  refunded: number;
  orderFees: number;
  couponSpend: number;
  brandsOwed: number;
  brandsPaid: number;
  platformFees: number;
  gatewayFees: number;
  cancelledItems: number;
  musesOwed: number;
  musesPaid: number;
};

export type MoneyBreakdownView = {
  range: FinancialRollupRange;
  collected: number;
  refunded: number;
  held: number;
  brandsOwed: number;
  brandsPaid: number;
  musesOwed: number;
  musesPaid: number;
  gatewayFees: number;
  platformKeeps: number;
  orderFees: number;
  cancelledNotRefunded: number;
  couponSpend: number;
  unexplained: number;
};

export type LedgerRow = {
  orderId: string;
  orderItemId: string;
  createdAt: Date;
  paymentMethod: PaymentMethod;
  orderPaymentStatus: PaymentStatus;
  orderFulfilmentStatus: FulfilmentStatus;
  quantity: number;
  productName: string;
  productImageUrl: string | null;
  brandName: string;
  buyerName: string;
  museHandle: string | null;
  grossAmount: number | null;
  platformFee: number | null;
  gatewayFee: number | null;
  brandNetAmount: number | null;
  brandPayoutStatus: BrandPayoutStatus | null;
  creatorCommissionAmount: number | null;
  creatorCommissionStatus: CommissionStatus | null;
};

export type LedgerTotals = {
  rowCount: number;
  grossAmount: number;
  platformFee: number;
  gatewayFee: number;
  creatorCommissionAmount: number;
  brandNetAmount: number;
};

export type LedgerPage = {
  entries: LedgerRow[];
  nextCursor: string | null;
  totals: LedgerTotals;
};
