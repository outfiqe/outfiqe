import type { BrandPayoutStatus, CommissionStatus, PaymentMethod } from "@outfiqe/types";
import { z } from "zod";

export const rollupRangeSchema = z.enum(["cycle", "30d", "all"]);
export type RollupRange = z.infer<typeof rollupRangeSchema>;

const brandPayoutStatusValues = [
  "PENDING",
  "AVAILABLE",
  "WITHDRAWN",
  "VOIDED",
] satisfies BrandPayoutStatus[];
const commissionStatusValues = [
  "PENDING",
  "APPROVED",
  "AVAILABLE",
  "PAID",
  "VOIDED",
] satisfies CommissionStatus[];
const paymentMethodValues = ["COD", "ESEWA", "KHALTI"] satisfies PaymentMethod[];

export const paymentMethodBreakdownSchema = z.object({
  gmv: z.number(),
  orderCount: z.number(),
  realizedTakeRate: z.number(),
});
export type PaymentMethodBreakdown = z.infer<typeof paymentMethodBreakdownSchema>;

export const attributionSchema = z.object({
  totalItems: z.number(),
  attributedItems: z.number(),
  attributedShare: z.number(),
});
export type Attribution = z.infer<typeof attributionSchema>;

export const financialRollupSchema = z.object({
  range: rollupRangeSchema,
  gateway: z.object({
    grossCollected: z.number(),
    refunded: z.number(),
    netHeld: z.number(),
  }),
  ledger: z.object({
    owedToBrands: z.number(),
    owedToCreators: z.number(),
    brandPayoutsByStatus: z.partialRecord(z.enum(brandPayoutStatusValues), z.number()),
    creatorCommissionsByStatus: z.partialRecord(z.enum(commissionStatusValues), z.number()),
    platformRevenueRealized: z.number(),
    couponSpend: z.number(),
    netPlatformRevenue: z.number(),
  }),
  byPaymentMethod: z.partialRecord(z.enum(paymentMethodValues), paymentMethodBreakdownSchema),
  attribution: attributionSchema,
});
export type FinancialRollup = z.infer<typeof financialRollupSchema>;

export const ledgerRowSchema = z.object({
  orderId: z.string(),
  orderItemId: z.string(),
  createdAt: z.string(),
  paymentMethod: z.enum(paymentMethodValues),
  orderPaymentStatus: z.string(),
  orderFulfilmentStatus: z.string(),
  quantity: z.number(),
  productName: z.string(),
  productImageUrl: z.string().nullable(),
  brandName: z.string(),
  buyerName: z.string(),
  museHandle: z.string().nullable(),
  grossAmount: z.number().nullable(),
  platformFee: z.number().nullable(),
  gatewayFee: z.number().nullable(),
  brandNetAmount: z.number().nullable(),
  brandPayoutStatus: z.enum(brandPayoutStatusValues).nullable(),
  creatorCommissionAmount: z.number().nullable(),
  creatorCommissionStatus: z.enum(commissionStatusValues).nullable(),
});
export type LedgerRow = z.infer<typeof ledgerRowSchema>;

const ledgerTotalsSchema = z.object({
  rowCount: z.number(),
  grossAmount: z.number(),
  platformFee: z.number(),
  gatewayFee: z.number(),
  creatorCommissionAmount: z.number(),
  brandNetAmount: z.number(),
});
export type LedgerTotals = z.infer<typeof ledgerTotalsSchema>;

export const ledgerPageSchema = z.object({
  entries: z.array(ledgerRowSchema),
  nextCursor: z.string().nullable(),
  totals: ledgerTotalsSchema,
});
export type LedgerPage = z.infer<typeof ledgerPageSchema>;

export const ledgerFocusValues = [
  "OWED_TO_BRANDS",
  "OWED_TO_MUSES",
  "REFUNDED",
  "MUSE_CREDITED",
  "PLATFORM_EARNED",
] as const;
export type LedgerFocus = (typeof ledgerFocusValues)[number];

export type LedgerFilters = {
  range?: RollupRange;
  paymentMethod?: PaymentMethod;
  brandPayoutStatus?: BrandPayoutStatus;
  commissionStatus?: CommissionStatus;
  focus?: LedgerFocus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

export const ledgerItemSchema = z.object({
  id: z.string(),
  qty: z.number(),
  unitPrice: z.number(),
  listUnitPrice: z.number(),
  brandDiscountAmount: z.number(),
  refundedQty: z.number(),
  createdAt: z.string(),
  attributionSource: z.string().nullable(),
  attributedCreatorLookId: z.string().nullable(),
  attributedOutfitId: z.string().nullable(),
  size: z.object({ label: z.string() }),
  product: z.object({
    id: z.string(),
    name: z.string(),
    imageUrl: z.string().nullable(),
    brand: z.object({ id: z.string(), name: z.string() }),
  }),
  attributedCreator: z.object({ id: z.string(), name: z.string(), handle: z.string() }).nullable(),
  brandPayout: z
    .object({
      grossAmount: z.number(),
      platformFee: z.number(),
      gatewayFee: z.number(),
      netAmount: z.number(),
      status: z.enum(brandPayoutStatusValues),
      availableAt: z.string().nullable(),
      withdrawnAt: z.string().nullable(),
      voidedReason: z.string().nullable(),
      needsManualClawback: z.boolean(),
    })
    .nullable(),
  commissions: z.array(
    z.object({
      id: z.string(),
      amount: z.number(),
      status: z.enum(commissionStatusValues),
      source: z.string(),
      availableAt: z.string().nullable(),
      paidAt: z.string().nullable(),
      voidedReason: z.string().nullable(),
      creator: z.object({ name: z.string(), handle: z.string() }).nullable(),
      recipientBrand: z.object({ name: z.string() }).nullable(),
    }),
  ),
  order: z.object({
    id: z.string(),
    createdAt: z.string(),
    fullName: z.string(),
    phone: z.string(),
    address: z.string(),
    city: z.string(),
    paymentMethod: z.enum(paymentMethodValues),
    paymentStatus: z.string(),
    fulfilmentStatus: z.string(),
    subtotal: z.number(),
    deliveryFee: z.number(),
    total: z.number(),
    platformDiscountTotal: z.number(),
    brandDiscountTotal: z.number(),
    user: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().nullable(),
      handle: z.string(),
    }),
    couponRedemption: z
      .object({
        discountAmount: z.number(),
        platformFundedAmount: z.number(),
        brandFundedAmount: z.number(),
        status: z.string(),
        coupon: z.object({ code: z.string() }),
      })
      .nullable(),
    transactions: z.array(
      z.object({
        id: z.string(),
        provider: z.enum(paymentMethodValues),
        type: z.string(),
        status: z.string(),
        amount: z.number().nullable(),
        createdAt: z.string(),
      }),
    ),
    refunds: z.array(
      z.object({
        id: z.string(),
        status: z.string(),
        cause: z.string(),
        reason: z.string(),
        totalAmount: z.number(),
        createdAt: z.string(),
      }),
    ),
    _count: z.object({ items: z.number() }),
  }),
});
export type LedgerItem = z.infer<typeof ledgerItemSchema>;
