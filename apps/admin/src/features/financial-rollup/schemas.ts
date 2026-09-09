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
  }),
  byPaymentMethod: z.partialRecord(z.enum(paymentMethodValues), paymentMethodBreakdownSchema),
});
export type FinancialRollup = z.infer<typeof financialRollupSchema>;

export const ledgerRowSchema = z.object({
  orderId: z.string(),
  orderItemId: z.string(),
  createdAt: z.string(),
  paymentMethod: z.enum(paymentMethodValues),
  grossAmount: z.number().nullable(),
  platformFee: z.number().nullable(),
  gatewayFee: z.number().nullable(),
  brandNetAmount: z.number().nullable(),
  brandPayoutStatus: z.enum(brandPayoutStatusValues).nullable(),
  creatorCommissionAmount: z.number().nullable(),
  creatorCommissionStatus: z.enum(commissionStatusValues).nullable(),
});
export type LedgerRow = z.infer<typeof ledgerRowSchema>;

export const ledgerPageSchema = z.object({
  entries: z.array(ledgerRowSchema),
  nextCursor: z.string().nullable(),
});
export type LedgerPage = z.infer<typeof ledgerPageSchema>;

export type LedgerFilters = {
  paymentMethod?: PaymentMethod;
  brandPayoutStatus?: BrandPayoutStatus;
  dateFrom?: string;
  dateTo?: string;
};
