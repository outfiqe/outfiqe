import { z } from "zod";

import { BrandPayoutStatus, PaymentMethod } from "#generated/prisma/enums.js";

import { DEFAULT_LEDGER_PAGE_SIZE, MAX_LEDGER_PAGE_SIZE } from "./financialRollup.constants.js";

export const financialRollupQuerySchema = z.object({
  range: z.enum(["cycle", "30d", "all"]).default("cycle"),
});
export type FinancialRollupQuery = z.infer<typeof financialRollupQuerySchema>;

const ledgerFilterFields = {
  paymentMethod: z.enum(PaymentMethod).optional(),
  brandPayoutStatus: z.enum(BrandPayoutStatus).optional(),
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
