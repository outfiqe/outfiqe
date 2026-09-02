import type { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import type { refreshResponseSchema } from "./schemas";
import {
  type AdminInviteInfo,
  adminInviteInfoSchema,
  type AdminUser,
  adminUserSchema,
  type CrmInviteInfo,
  crmInviteInfoSchema,
  loginResponseSchema,
  type UpdateProfileInput,
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

  async updateProfile(input: UpdateProfileInput): Promise<AdminUser> {
    const res = await apiClient.patch<AdminUser>("/users/me", input);
    return adminUserSchema.parse(res.data);
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
    confirmPassword: string;
  }): Promise<LoginResult> {
    const res = await apiClient.post<LoginResult>("/auth/register/admin", input);
    return loginResponseSchema.parse(res.data);
  },

  async getCrmInvite(token: string): Promise<CrmInviteInfo> {
    const res = await apiClient.get<CrmInviteInfo>(
      `/auth/invite/crm?token=${encodeURIComponent(token)}`,
    );
    return crmInviteInfoSchema.parse(res.data);
  },

  async registerFromCrmInvite(input: {
    inviteToken: string;
    name: string;
    phone: string;
    password: string;
    confirmPassword: string;
  }): Promise<LoginResult> {
    const res = await apiClient.post<LoginResult>("/auth/register/crm-invite", input);
    return loginResponseSchema.parse(res.data);
  },
};
