import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import { adminUserSchema } from "./schemas";

const usersPageSchema = z.object({
  items: z.array(adminUserSchema),
  nextCursor: z.string().nullable(),
});
export type UsersPage = z.infer<typeof usersPageSchema>;

export const usersApi = {
  async list(q: string | undefined, cursor?: string): Promise<UsersPage> {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (cursor) params.set("cursor", cursor);

    const query = params.toString();
    const res = await apiClient.get<UsersPage>(`/users${query ? `?${query}` : ""}`);
    return usersPageSchema.parse(res.data);
  },

  async suspend(userId: string, reason: string, durationHours?: number): Promise<void> {
    await apiClient.post(`/platform/users/${userId}/suspend`, { reason, durationHours });
  },

  async ban(userId: string, reason: string): Promise<void> {
    await apiClient.post(`/platform/users/${userId}/ban`, { reason });
  },

  async unsuspend(userId: string): Promise<void> {
    await apiClient.post(`/platform/users/${userId}/unsuspend`);
  },

  async unban(userId: string): Promise<void> {
    await apiClient.post(`/platform/users/${userId}/unban`);
  },
};
