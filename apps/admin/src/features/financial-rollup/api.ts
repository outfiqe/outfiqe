import { apiClient } from "@/lib/apiClient";

import { type FinancialRollup, financialRollupSchema, type RollupRange } from "./schemas";

export const financialRollupApi = {
  async get(range: RollupRange): Promise<FinancialRollup> {
    const res = await apiClient.get<FinancialRollup>(`/admin/financial-rollup?range=${range}`);
    return financialRollupSchema.parse(res.data);
  },
};
