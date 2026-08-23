import { apiClient } from "@/shared/lib/apiClient";

export type UpdateOwnProfileInput = {
  name?: string;
  phone?: string;
  avatarUrl?: string | null;
};

export const profileApi = {
  async updateMe(input: UpdateOwnProfileInput): Promise<void> {
    await apiClient.patch("/users/me", input);
  },
};
