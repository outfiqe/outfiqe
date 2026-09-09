import { BrandPayoutStatus, CommissionStatus } from "#generated/prisma/enums.js";

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
