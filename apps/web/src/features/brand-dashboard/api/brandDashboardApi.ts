import { apiClient } from "@/shared/lib/apiClient";
import {
  brandProfileSchema,
  type BrandProfile,
  type UpdateBrandProfileInput,
} from "./brandDashboardSchemas";

export const brandDashboardApi = {
  async updateMe(input: UpdateBrandProfileInput): Promise<BrandProfile> {
    const res = await apiClient.patch<BrandProfile>("/brands/me", input);
    return brandProfileSchema.parse(res.data);
  },
};
