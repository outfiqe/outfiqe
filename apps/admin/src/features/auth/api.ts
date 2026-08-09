import { apiClient } from "@/lib/apiClient";
import {
  adminInviteInfoSchema,
  adminUserSchema,
  loginResponseSchema,
  refreshResponseSchema,
  type AdminInviteInfo,
  type AdminUser,
} from "./schemas";

type LoginResult = { accessToken: string; user: AdminUser };

export const authApi = {
  async refresh(): Promise<{ accessToken: string }> {
    const res = await apiClient.post<unknown>("/auth/refresh", undefined, { skipAuthRetry: true });
    return refreshResponseSchema.parse(res.data);
  },

  async me(): Promise<AdminUser> {
    const res = await apiClient.get<unknown>("/auth/me");
    return adminUserSchema.parse(res.data);
  },

  async logout(): Promise<void> {
    await apiClient.post("/auth/logout");
  },

  async getAdminInvite(token: string): Promise<AdminInviteInfo> {
    const res = await apiClient.get<unknown>(
      `/auth/invite/admin?token=${encodeURIComponent(token)}`,
    );
    return adminInviteInfoSchema.parse(res.data);
  },

  async registerAdmin(input: {
    inviteToken: string;
    phone: string;
    password: string;
  }): Promise<LoginResult> {
    const res = await apiClient.post<unknown>("/auth/register/admin", input);
    return loginResponseSchema.parse(res.data);
  },
};
