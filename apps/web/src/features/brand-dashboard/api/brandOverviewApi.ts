import { apiClient } from "@/shared/lib/apiClient";
import type { OverviewPeriodDays } from "@/shared/lib/overviewPeriod";

import { type BrandOverview, brandOverviewSchema } from "./brandOverviewSchemas";

export const brandOverviewApi = {
  async getMine(periodDays: OverviewPeriodDays): Promise<BrandOverview> {
    const res = await apiClient.get<BrandOverview>(`/brands/me/overview?days=${periodDays}`);
    return brandOverviewSchema.parse(res.data);
  },
};
