import { BrandPayoutStatus, CommissionStatus } from "#generated/prisma/enums.js";

export const LEDGER_FOCUS = {
  OWED_TO_BRANDS: "OWED_TO_BRANDS",
  OWED_TO_MUSES: "OWED_TO_MUSES",
  REFUNDED: "REFUNDED",
  MUSE_CREDITED: "MUSE_CREDITED",
  PLATFORM_EARNED: "PLATFORM_EARNED",
} as const;

export type LedgerFocus = (typeof LEDGER_FOCUS)[keyof typeof LEDGER_FOCUS];

export const OUTSTANDING_BRAND_PAYOUT_STATUSES = [
  BrandPayoutStatus.PENDING,
  BrandPayoutStatus.AVAILABLE,
] as const;

export const OUTSTANDING_COMMISSION_STATUSES = [
  CommissionStatus.PENDING,
  CommissionStatus.APPROVED,
  CommissionStatus.AVAILABLE,
] as const;

export const DEFAULT_LEDGER_PAGE_SIZE = 25;
export const MAX_LEDGER_PAGE_SIZE = 100;
export const MAX_LEDGER_EXPORT_ROWS = 5000;
