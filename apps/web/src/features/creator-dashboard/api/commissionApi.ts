import { apiClient } from "@/shared/lib/apiClient";

import {
  type CommissionEligibility,
  commissionEligibilitySchema,
  type EarningsPage,
  earningsPageSchema,
  type EarningsSummary,
  earningsSummarySchema,
} from "./commissionSchemas";

export const commissionApi = {
  async getMyEligibility(): Promise<CommissionEligibility> {
    const res = await apiClient.get<CommissionEligibility>("/commissions/me/eligibility");
    return commissionEligibilitySchema.parse(res.data);
  },

  async getMySummary(): Promise<EarningsSummary> {
    const res = await apiClient.get<EarningsSummary>("/commissions/me/summary");
    return earningsSummarySchema.parse(res.data);
  },

  async listMine(cursor?: string): Promise<EarningsPage> {
    const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const res = await apiClient.get<EarningsPage>(`/commissions/me${params}`);
    return earningsPageSchema.parse(res.data);
  },
};
