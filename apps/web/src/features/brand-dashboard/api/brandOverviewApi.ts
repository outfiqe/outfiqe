import { apiClient } from "@/shared/lib/apiClient";

import { type BrandOverview, brandOverviewSchema } from "./brandOverviewSchemas";

export const brandOverviewApi = {
  async getMine(): Promise<BrandOverview> {
    const res = await apiClient.get<BrandOverview>("/brands/me/overview");
    return brandOverviewSchema.parse(res.data);
  },
};
