import { z } from "zod";

import { BrandPayoutStatus, CommissionStatus, PaymentMethod } from "#generated/prisma/enums.js";

import {
  DEFAULT_LEDGER_PAGE_SIZE,
  LEDGER_FOCUS,
  MAX_LEDGER_PAGE_SIZE,
} from "./financial-rollup.constants.js";

const ROLLUP_RANGES = ["cycle", "30d", "all"] as const;
const MIN_LEDGER_SEARCH_LENGTH = 2;
const MAX_LEDGER_SEARCH_LENGTH = 100;

export const financialRollupQuerySchema = z.object({
  range: z.enum(ROLLUP_RANGES).default("cycle"),
});
export type FinancialRollupQuery = z.infer<typeof financialRollupQuerySchema>;

const ledgerFilterFields = {
  range: z.enum(ROLLUP_RANGES).optional(),
  paymentMethod: z.enum(PaymentMethod).optional(),
  brandPayoutStatus: z.enum(BrandPayoutStatus).optional(),
  commissionStatus: z.enum(CommissionStatus).optional(),
  focus: z.enum(LEDGER_FOCUS).optional(),
  search: z.string().trim().min(MIN_LEDGER_SEARCH_LENGTH).max(MAX_LEDGER_SEARCH_LENGTH).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
};

const validDateRange = (query: { dateFrom?: Date; dateTo?: Date }) =>
  !query.dateFrom || !query.dateTo || query.dateFrom <= query.dateTo;
const DATE_RANGE_REFINEMENT = {
  message: "dateFrom must be on or before dateTo",
  path: ["dateFrom"] as PropertyKey[],
};

export const financialLedgerQuerySchema = z
  .object({
    ...ledgerFilterFields,
    cursor: z.string().optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_LEDGER_PAGE_SIZE)
      .default(DEFAULT_LEDGER_PAGE_SIZE),
  })
  .refine(validDateRange, DATE_RANGE_REFINEMENT);
export type FinancialLedgerQuery = z.infer<typeof financialLedgerQuerySchema>;

export const financialLedgerExportQuerySchema = z
  .object({ ...ledgerFilterFields })
  .refine(validDateRange, DATE_RANGE_REFINEMENT);
export type FinancialLedgerExportQuery = z.infer<typeof financialLedgerExportQuerySchema>;

export const ledgerItemParamSchema = z.object({ orderItemId: z.uuid() });
export type LedgerItemParam = z.infer<typeof ledgerItemParamSchema>;
