import { toDayEndIso, toDayStartIso } from "@outfiqe/utils";

import { apiClient } from "@/lib/apiClient";

import {
  type FinancialRollup,
  financialRollupSchema,
  type LedgerFilters,
  type LedgerItem,
  ledgerItemSchema,
  type LedgerPage,
  ledgerPageSchema,
  type MoneyBreakdown,
  moneyBreakdownSchema,
  type RollupRange,
} from "./financialRollupSchemas";

const LEDGER_PAGE_SIZE = 25;

const buildLedgerParams = ({
  range,
  paymentMethod,
  brandPayoutStatus,
  commissionStatus,
  focus,
  search,
  dateFrom,
  dateTo,
}: LedgerFilters): URLSearchParams => {
  const params = new URLSearchParams();
  if (range) params.set("range", range);
  if (paymentMethod) params.set("paymentMethod", paymentMethod);
  if (brandPayoutStatus) params.set("brandPayoutStatus", brandPayoutStatus);
  if (commissionStatus) params.set("commissionStatus", commissionStatus);
  if (focus) params.set("focus", focus);
  if (search) params.set("search", search);
  if (dateFrom) params.set("dateFrom", toDayStartIso(dateFrom));
  if (dateTo) params.set("dateTo", toDayEndIso(dateTo));
  return params;
};

export const financialRollupApi = {
  async get(range: RollupRange): Promise<FinancialRollup> {
    const res = await apiClient.get<FinancialRollup>(`/admin/financial-rollup?range=${range}`);
    return financialRollupSchema.parse(res.data);
  },

  async getMoneyBreakdown(range: RollupRange): Promise<MoneyBreakdown> {
    const res = await apiClient.get<MoneyBreakdown>(
      `/admin/financial-rollup/money-breakdown?range=${range}`,
    );
    return moneyBreakdownSchema.parse(res.data);
  },

  async getLedger(filters: LedgerFilters, cursor?: string): Promise<LedgerPage> {
    const params = buildLedgerParams(filters);
    params.set("limit", String(LEDGER_PAGE_SIZE));
    if (cursor) params.set("cursor", cursor);

    const res = await apiClient.get<LedgerPage>(`/admin/financial-rollup/ledger?${params}`);
    return ledgerPageSchema.parse(res.data);
  },

  async getLedgerItem(orderItemId: string): Promise<LedgerItem> {
    const res = await apiClient.get<LedgerItem>(`/admin/financial-rollup/ledger/${orderItemId}`);
    return ledgerItemSchema.parse(res.data);
  },

  exportLedger(filters: LedgerFilters): Promise<Blob> {
    return apiClient.getBlob(`/admin/financial-rollup/ledger/export?${buildLedgerParams(filters)}`);
  },
};
