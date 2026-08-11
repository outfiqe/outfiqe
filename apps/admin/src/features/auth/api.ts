import type { z } from "zod";

import { apiClient } from "@/lib/apiClient";
import {
  adminInviteInfoSchema,
  adminUserSchema,
  loginResponseSchema,
  refreshResponseSchema,
  type AdminInviteInfo,
  type AdminUser,
} from "./schemas";

type LoginResult = z.infer<typeof loginResponseSchema>;
type RefreshResult = z.infer<typeof refreshResponseSchema>;

export const authApi = {
  async refresh(): Promise<RefreshResult> {
    return { accessToken: await apiClient.refresh() };
  },

  async me(): Promise<AdminUser> {
    const res = await apiClient.get<AdminUser>("/auth/me");
    return adminUserSchema.parse(res.data);
  },

  async logout(): Promise<void> {
    await apiClient.post("/auth/logout");
  },

  async getAdminInvite(token: string): Promise<AdminInviteInfo> {
    const res = await apiClient.get<AdminInviteInfo>(
      `/auth/invite/admin?token=${encodeURIComponent(token)}`,
    );
    return adminInviteInfoSchema.parse(res.data);
  },

  async registerAdmin(input: {
    inviteToken: string;
    phone: string;
    password: string;
  }): Promise<LoginResult> {
    const res = await apiClient.post<LoginResult>("/auth/register/admin", input);
    return loginResponseSchema.parse(res.data);
  },
};
