import { apiClient } from "@/shared/lib/apiClient";

import { type BrandPayoutSummary, brandPayoutSummarySchema } from "./brandPayoutSchemas";

export const brandPayoutApi = {
  async getMySummary(): Promise<BrandPayoutSummary> {
    const res = await apiClient.get<BrandPayoutSummary>("/brand-payouts/me/summary");
    return brandPayoutSummarySchema.parse(res.data);
  },
};
