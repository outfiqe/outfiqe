import { z } from "zod";

import { BrandPayoutStatus, PaymentMethod } from "#generated/prisma/enums.js";

import { DEFAULT_LEDGER_PAGE_SIZE, MAX_LEDGER_PAGE_SIZE } from "./financialRollup.constants.js";

export const financialRollupQuerySchema = z.object({
  range: z.enum(["cycle", "30d", "all"]).default("cycle"),
});
export type FinancialRollupQuery = z.infer<typeof financialRollupQuerySchema>;

export const financialLedgerQuerySchema = z
  .object({
    paymentMethod: z.enum(PaymentMethod).optional(),
    brandPayoutStatus: z.enum(BrandPayoutStatus).optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    cursor: z.string().optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_LEDGER_PAGE_SIZE)
      .default(DEFAULT_LEDGER_PAGE_SIZE),
  })
  .refine((query) => !query.dateFrom || !query.dateTo || query.dateFrom <= query.dateTo, {
    message: "dateFrom must be on or before dateTo",
    path: ["dateFrom"],
  });
export type FinancialLedgerQuery = z.infer<typeof financialLedgerQuerySchema>;
