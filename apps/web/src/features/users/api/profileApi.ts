import { apiClient } from "@/shared/lib/apiClient";

import {
  type HandleAvailability,
  handleAvailabilitySchema,
  type UpdateOwnProfileInput,
} from "./userProfileSchemas";

export type UpdateOwnProfileApiInput = UpdateOwnProfileInput & { phone?: string };

export const profileApi = {
  async updateMe(input: UpdateOwnProfileApiInput): Promise<void> {
    await apiClient.patch("/users/me", input);
  },

  async checkHandleAvailability(handle: string): Promise<HandleAvailability> {
    const params = new URLSearchParams({ handle });
    const res = await apiClient.get<HandleAvailability>(`/users/handle-availability?${params}`);
    return handleAvailabilitySchema.parse(res.data);
  },
};
