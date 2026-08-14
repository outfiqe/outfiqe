import { apiClient } from "@/shared/lib/apiClient";

import {
  type BrandProfile,
  brandProfileSchema,
  type UpdateBrandProfileInput,
} from "./brandDashboardSchemas";

export const brandDashboardApi = {
  async updateMe(input: UpdateBrandProfileInput): Promise<BrandProfile> {
    const res = await apiClient.patch<BrandProfile>("/brands/me", input);
    return brandProfileSchema.parse(res.data);
  },
};
