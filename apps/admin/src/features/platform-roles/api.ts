import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import {
  type PlatformMembershipStatusValue,
  type PlatformPermission,
  platformPermissionSchema,
  type PlatformRole,
  platformRoleSchema,
  type PlatformTeamMember,
  platformTeamMemberSchema,
} from "./schemas";

const rolesListSchema = z.array(platformRoleSchema);
const permissionsListSchema = z.array(platformPermissionSchema);
const teamListSchema = z.array(platformTeamMemberSchema);

type PlatformRoleInput = { name: string; permissionKeys: string[] };

export const platformRolesApi = {
  async listRoles(): Promise<PlatformRole[]> {
    const res = await apiClient.get<PlatformRole[]>("/platform/roles");
    return rolesListSchema.parse(res.data);
  },

  async listPermissions(): Promise<PlatformPermission[]> {
    const res = await apiClient.get<PlatformPermission[]>("/platform/permissions");
    return permissionsListSchema.parse(res.data);
  },

  async createRole(body: PlatformRoleInput): Promise<PlatformRole> {
    const res = await apiClient.post<PlatformRole>("/platform/roles", body);
    return platformRoleSchema.parse(res.data);
  },

  async updateRole(roleId: string, body: Partial<PlatformRoleInput>): Promise<PlatformRole> {
    const res = await apiClient.patch<PlatformRole>(`/platform/roles/${roleId}`, body);
    return platformRoleSchema.parse(res.data);
  },

  async deleteRole(roleId: string): Promise<void> {
    await apiClient.del(`/platform/roles/${roleId}`);
  },

  async listTeam(): Promise<PlatformTeamMember[]> {
    const res = await apiClient.get<PlatformTeamMember[]>("/platform/team");
    return teamListSchema.parse(res.data);
  },

  async updateTeamMember(
    membershipId: string,
    body: { roleId?: string; status?: PlatformMembershipStatusValue },
  ): Promise<void> {
    await apiClient.patch(`/platform/team/${membershipId}`, body);
  },
};
