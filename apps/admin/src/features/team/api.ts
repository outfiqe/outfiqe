import { apiClient } from "@/lib/apiClient";

import { type AdminInviteListResult, adminInviteListResultSchema } from "./schemas";

export const teamApi = {
  async list(): Promise<AdminInviteListResult> {
    const res = await apiClient.get<AdminInviteListResult>("/admin/invites");
    return adminInviteListResultSchema.parse(res.data);
  },

  async invite(email: string, name: string): Promise<void> {
    await apiClient.post("/admin/invites", { email, name });
  },
};
