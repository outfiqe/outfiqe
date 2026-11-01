import type { BrandPayoutStatus, CommissionStatus, PaymentMethod } from "@outfiqe/types";

import type { LedgerFocus, RollupRange } from "../api/financialRollupSchemas";

export const LEDGER_PATH = "/financial-rollup/ledger";

export const DEFAULT_ROLLUP_RANGE: RollupRange = "cycle";
export const ROLLUP_RANGE_ORDER: RollupRange[] = [DEFAULT_ROLLUP_RANGE, "30d", "all"];
export const ROLLUP_RANGE_LABEL: Record<RollupRange, string> = {
  cycle: "This cycle",
  "30d": "Last 30 days",
  all: "All time",
};

export const PAYMENT_METHOD_ORDER: PaymentMethod[] = ["COD", "ESEWA", "KHALTI"];
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  COD: "Cash on delivery",
  ESEWA: "eSewa",
  KHALTI: "Khalti",
};

export const BRAND_PAYOUT_STATUS_ORDER: BrandPayoutStatus[] = [
  "PENDING",
  "AVAILABLE",
  "WITHDRAWN",
  "VOIDED",
];
export const BRAND_PAYOUT_STATUS_LABEL: Record<BrandPayoutStatus, string> = {
  PENDING: "Pending",
  AVAILABLE: "Ready to withdraw",
  WITHDRAWN: "Paid out",
  VOIDED: "Cancelled",
};
export const BRAND_PAYOUT_STATUS_EXPLANATION: Record<BrandPayoutStatus, string> = {
  PENDING: "Earned, but the brand can't withdraw it yet.",
  AVAILABLE: "The brand can withdraw this now.",
  WITHDRAWN: "Already paid to the brand.",
  VOIDED: "Won't be paid, because the order was cancelled, refused or returned.",
};

export const COMMISSION_STATUS_ORDER: CommissionStatus[] = [
  "PENDING",
  "APPROVED",
  "AVAILABLE",
  "PAID",
  "VOIDED",
];
export const COMMISSION_STATUS_LABEL: Record<CommissionStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  AVAILABLE: "Ready to withdraw",
  PAID: "Paid out",
  VOIDED: "Cancelled",
};
export const COMMISSION_STATUS_EXPLANATION: Record<CommissionStatus, string> = {
  PENDING: "Earned, waiting for the order to finish.",
  APPROVED: "Checked and approved, not ready to withdraw yet.",
  AVAILABLE: "The muse can withdraw this now.",
  PAID: "Already paid to the muse.",
  VOIDED: "Won't be paid, because the order was cancelled, refused or returned.",
};

export const LEDGER_FOCUS_ORDER: LedgerFocus[] = [
  "OWED_TO_BRANDS",
  "OWED_TO_MUSES",
  "REFUNDED",
  "MUSE_CREDITED",
  "PLATFORM_EARNED",
];
export const LEDGER_FOCUS_LABEL: Record<LedgerFocus, string> = {
  OWED_TO_BRANDS: "Still owed to brands",
  OWED_TO_MUSES: "Still owed to muses",
  REFUNDED: "Refunded",
  MUSE_CREDITED: "Sold through a muse",
  PLATFORM_EARNED: "Platform earnings",
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  PLACED: "Placed",
  PACKED: "Packed",
  SHIPPED: "On the way",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
  INITIATED: "Started",
  PAID: "Paid",
  DUE: "Cash due on delivery",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Part refunded",
  SUCCEEDED: "Successful",
  PENDING: "Pending",
  NEEDS_MANUAL: "Needs a person",
  PAYMENT: "Payment",
  REFUND: "Refund",
};

const COMMISSION_SOURCE_LABEL: Record<string, string> = {
  TAG_CLICK: "Tag on a look",
  INTERNAL_LINK: "Muse link on Outfiqe",
  EXTERNAL_LINK: "Muse link shared outside",
  OUTFIT_BUILD: "Outfit build",
};

const toSentenceCase = (code: string): string => {
  const words = code.toLowerCase().replaceAll("_", " ");
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
};

export const toOrderStatusLabel = (status: string): string =>
  ORDER_STATUS_LABEL[status] ?? toSentenceCase(status);

export const toCommissionSourceLabel = (source: string): string =>
  COMMISSION_SOURCE_LABEL[source] ?? toSentenceCase(source);

export const money = (amount: number) => `Rs. ${amount.toLocaleString()}`;
export const percent = (fraction: number) => `${(fraction * 100).toFixed(1)}%`;
