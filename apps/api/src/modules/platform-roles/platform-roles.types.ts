import type { MembershipStatus } from "#generated/prisma/enums.js";

export type {
  PermissionRecord as PlatformPermissionRecord,
  RoleWithPermissions as PlatformRoleWithPermissions,
  MembershipSummary as PlatformTeamMemberSummary,
} from "#modules/crm-access/crm-access.types.js";

export type CreatePlatformRoleInput = {
  name: string;
  permissionKeys: string[];
};

export type UpdatePlatformRoleInput = {
  name?: string;
  permissionKeys?: string[];
};

export type UpdatePlatformTeamMemberInput = {
  roleId?: string;
  status?: MembershipStatus;
};
