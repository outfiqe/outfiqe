import { apiClient } from "@/shared/lib/apiClient";
import { creatorProfileSchema, type CreatorProfile } from "./creatorDashboardSchemas";

export const creatorDashboardApi = {
  async apply(): Promise<CreatorProfile> {
    const res = await apiClient.post<unknown>("/creators/apply");
    return creatorProfileSchema.parse(res.data);
  },
};
