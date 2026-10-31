import { apiClient } from "@/shared/lib/apiClient";
import type { OverviewPeriodDays } from "@/shared/lib/overviewPeriod";

import { type CreatorOverview, creatorOverviewSchema } from "./creatorOverviewSchemas";

export const creatorOverviewApi = {
  async getMine(periodDays: OverviewPeriodDays): Promise<CreatorOverview> {
    const res = await apiClient.get<CreatorOverview>(`/creators/me/overview?days=${periodDays}`);
    return creatorOverviewSchema.parse(res.data);
  },
};
