import { apiClient } from "@/shared/lib/apiClient";

import {
  type CreatorProfile,
  creatorProfileSchema,
  type HandleAvailability,
  handleAvailabilitySchema,
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

  async checkHandleAvailability(handle: string): Promise<HandleAvailability> {
    const params = new URLSearchParams({ handle });
    const res = await apiClient.get<HandleAvailability>(`/users/handle-availability?${params}`);
    return handleAvailabilitySchema.parse(res.data);
  },
};
