import { apiClient } from "@/shared/lib/apiClient";
import {
  creatorProfileSchema,
  type CreatorProfile,
  type UpdateCreatorProfileInput,
} from "./creatorDashboardSchemas";

export const creatorDashboardApi = {
  async apply(): Promise<CreatorProfile> {
    const res = await apiClient.post<CreatorProfile>("/creators/apply");
    return creatorProfileSchema.parse(res.data);
  },

  async updateMe(input: UpdateCreatorProfileInput): Promise<CreatorProfile> {
    const res = await apiClient.patch<CreatorProfile>("/creators/me", input);
    return creatorProfileSchema.parse(res.data);
  },
};
