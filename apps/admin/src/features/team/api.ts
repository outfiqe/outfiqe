import { z } from "zod";

import { apiClient } from "@/lib/apiClient";
import { adminInviteSummarySchema, type AdminInviteSummary } from "./schemas";

const listSchema = z.array(adminInviteSummarySchema);

export const teamApi = {
  async list(): Promise<AdminInviteSummary[]> {
    const res = await apiClient.get<AdminInviteSummary[]>("/admin/invites");
    return listSchema.parse(res.data);
  },

  async invite(email: string, name: string): Promise<void> {
    await apiClient.post("/admin/invites", { email, name });
  },
};
