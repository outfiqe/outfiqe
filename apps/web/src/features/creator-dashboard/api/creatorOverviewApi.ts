import { apiClient } from "@/shared/lib/apiClient";

import { type CreatorOverview, creatorOverviewSchema } from "./creatorOverviewSchemas";

export const creatorOverviewApi = {
  async getMine(): Promise<CreatorOverview> {
    const res = await apiClient.get<CreatorOverview>("/creators/me/overview");
    return creatorOverviewSchema.parse(res.data);
  },
};
