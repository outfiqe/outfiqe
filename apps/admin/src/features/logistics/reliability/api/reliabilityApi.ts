import { apiClient } from "@/lib/apiClient";

import { brandsToWatchResponseSchema, type BrandToWatch } from "./reliabilitySchemas";

export const reliabilityApi = {
  async listBrandsToWatch(): Promise<BrandToWatch[]> {
    const res = await apiClient.get("/logistics/admin/brand-reliability");
    return brandsToWatchResponseSchema.parse(res.data).brands;
  },
};
