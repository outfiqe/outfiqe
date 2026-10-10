import { apiClient } from "@/lib/apiClient";

import { type AdminInviteListResult, adminInviteListResultSchema } from "./teamSchemas";

export const teamApi = {
  async list(): Promise<AdminInviteListResult> {
    const res = await apiClient.get<AdminInviteListResult>("/admin/invites");
    return adminInviteListResultSchema.parse(res.data);
  },

  async invite(email: string, name: string, roleId: string): Promise<void> {
    await apiClient.post("/admin/invites", { email, name, roleId });
  },
};
