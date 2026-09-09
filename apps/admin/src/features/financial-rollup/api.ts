import { apiClient } from "@/lib/apiClient";

import {
  type FinancialRollup,
  financialRollupSchema,
  type LedgerFilters,
  type LedgerPage,
  ledgerPageSchema,
  type RollupRange,
} from "./schemas";

const LEDGER_PAGE_SIZE = 25;

export const financialRollupApi = {
  async get(range: RollupRange): Promise<FinancialRollup> {
    const res = await apiClient.get<FinancialRollup>(`/admin/financial-rollup?range=${range}`);
    return financialRollupSchema.parse(res.data);
  },

  async getLedger(filters: LedgerFilters, cursor?: string): Promise<LedgerPage> {
    const params = new URLSearchParams({ limit: String(LEDGER_PAGE_SIZE) });
    if (filters.paymentMethod) params.set("paymentMethod", filters.paymentMethod);
    if (filters.brandPayoutStatus) params.set("brandPayoutStatus", filters.brandPayoutStatus);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    if (cursor) params.set("cursor", cursor);

    const res = await apiClient.get<LedgerPage>(`/admin/financial-rollup/ledger?${params}`);
    return ledgerPageSchema.parse(res.data);
  },
};
