import { prisma } from "#db/prisma.js";
import { isForeignKeyConstraintError, isUniqueConstraintError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { adminInviteRepository } from "#modules/admin-invites/adminInvite.repository.js";
import { crmAccessRepository } from "#modules/crm-access/crm-access.repository.js";
import { crmAccessService } from "#modules/crm-access/crm-access.service.js";
import type {
  ActingPermissionGrant,
  MembershipRecord,
} from "#modules/crm-access/crm-access.types.js";
import { canDeleteRole, toMembershipSummary } from "#modules/crm-access/crm-access.utils.js";
import { PLATFORM_PERMISSION_KEYS } from "#modules/platform-access/platform-access.constants.js";

import type {
  CreatePlatformRoleInput,
  PlatformPermissionRecord,
  PlatformRoleWithPermissions,
  PlatformTeamMemberSummary,
  UpdatePlatformRoleInput,
  UpdatePlatformTeamMemberInput,
} from "./platform-roles.types.js";
import {
  findUnselectablePlatformPermissionKeys,
  withoutPlatformAccessKey,
  withPlatformAccessKey,
  withPlatformAccessKeyOnPermissionChange,
} from "./platform-roles.utils.js";

const NOT_FOUND_STATUS = 404;
const FORBIDDEN_STATUS = 403;
const CONFLICT_STATUS = 409;

const CO_FOUNDER_ACTING_GRANT: ActingPermissionGrant = {
  isSuperAdmin: true,
  permissionKeys: [...PLATFORM_PERMISSION_KEYS],
};

const asPlatformRoleNameConflict = (err: unknown): unknown =>
  isUniqueConstraintError(err)
    ? new AppError(
        "PLATFORM_ROLE_NAME_TAKEN",
        "A platform role with that name already exists.",
        CONFLICT_STATUS,
      )
    : err;

const requirePlatformOrganizationId = async (): Promise<string> => {
  const platformOrganization = await crmAccessRepository.findPlatformOrganization();
  if (!platformOrganization) {
    throw new AppError(
      "PLATFORM_ORGANIZATION_NOT_FOUND",
      "The platform organization is not configured.",
      NOT_FOUND_STATUS,
    );
  }
  return platformOrganization.id;
};

const assertPermissionKeysSelectable = (permissionKeys: string[]): void => {
  const unselectable = findUnselectablePlatformPermissionKeys(permissionKeys);
  if (unselectable.length > 0) {
    throw new AppError(
      "INVALID_PERMISSION_KEYS",
      "One or more of the selected permissions can't be granted to a platform role.",
      FORBIDDEN_STATUS,
    );
  }
};

export const platformRolesService = {
  async listPermissions(): Promise<PlatformPermissionRecord[]> {
    return prisma.permission.findMany({
      where: { key: { in: [...PLATFORM_PERMISSION_KEYS] } },
      orderBy: [{ group: "asc" }, { key: "asc" }],
    });
  },

  async listRoles(): Promise<PlatformRoleWithPermissions[]> {
    const organizationId = await requirePlatformOrganizationId();
    const roles = await crmAccessRepository.listRoles(organizationId);
    return roles.map(withoutPlatformAccessKey);
  },

  async createRole(input: CreatePlatformRoleInput): Promise<PlatformRoleWithPermissions> {
    assertPermissionKeysSelectable(input.permissionKeys);
    const organizationId = await requirePlatformOrganizationId();
    try {
      const createdRole = await crmAccessRepository.createRole({
        organizationId,
        name: input.name,
        isBuiltIn: false,
        permissionKeys: withPlatformAccessKey(input.permissionKeys),
      });
      return withoutPlatformAccessKey(createdRole);
    } catch (err) {
      throw asPlatformRoleNameConflict(err);
    }
  },

  async updateRole(
    roleId: string,
    input: UpdatePlatformRoleInput,
  ): Promise<PlatformRoleWithPermissions> {
    const organizationId = await requirePlatformOrganizationId();
    const role = await crmAccessRepository.findRoleById(organizationId, roleId);
    if (!role) {
      throw new AppError("ROLE_NOT_FOUND", "Role not found.", NOT_FOUND_STATUS);
    }
    if (role.isBuiltIn) {
      throw new AppError("ROLE_IS_BUILT_IN", "Built-in roles can't be edited.", FORBIDDEN_STATUS);
    }
    if (input.permissionKeys !== undefined) {
      assertPermissionKeysSelectable(input.permissionKeys);
    }

    try {
      const updatedRole = await crmAccessRepository.updateRole(
        organizationId,
        roleId,
        withPlatformAccessKeyOnPermissionChange(input),
      );
      return withoutPlatformAccessKey(updatedRole);
    } catch (err) {
      throw asPlatformRoleNameConflict(err);
    }
  },

  async deleteRole(roleId: string): Promise<void> {
    const organizationId = await requirePlatformOrganizationId();
    const role = await crmAccessRepository.findRoleById(organizationId, roleId);
    if (!role) {
      throw new AppError("ROLE_NOT_FOUND", "Role not found.", NOT_FOUND_STATUS);
    }
    if (role.isBuiltIn) {
      throw new AppError("ROLE_IS_BUILT_IN", "Built-in roles can't be deleted.", FORBIDDEN_STATUS);
    }

    const [memberCount, pendingInviteCount] = await Promise.all([
      crmAccessRepository.countMembershipsForRole(organizationId, roleId),
      adminInviteRepository.countPendingByRoleId(roleId),
    ]);
    if (!canDeleteRole(role, memberCount) || pendingInviteCount > 0) {
      throw new AppError(
        "ROLE_IN_USE",
        "Reassign every member and pending invite off this role before deleting it.",
        CONFLICT_STATUS,
      );
    }

    try {
      await crmAccessRepository.deleteRole(organizationId, roleId);
    } catch (err) {
      if (isForeignKeyConstraintError(err)) {
        throw new AppError(
          "ROLE_IN_USE",
          "Reassign every member and pending invite off this role before deleting it.",
          CONFLICT_STATUS,
        );
      }
      throw err;
    }
  },

  async listTeam(): Promise<PlatformTeamMemberSummary[]> {
    const platformOrganization = await crmAccessRepository.findPlatformOrganization();
    if (!platformOrganization) return [];
    const memberships = await crmAccessRepository.listMemberships(platformOrganization.id);
    return memberships.map((membership) =>
      toMembershipSummary(membership, platformOrganization.superAdminMembershipId),
    );
  },

  async updateTeamMember(
    actingMembershipId: string,
    membershipId: string,
    input: UpdatePlatformTeamMemberInput,
  ): Promise<MembershipRecord> {
    const platformOrganization = await crmAccessRepository.findPlatformOrganization();
    if (!platformOrganization) {
      throw new AppError(
        "PLATFORM_ORGANIZATION_NOT_FOUND",
        "The platform organization is not configured.",
        NOT_FOUND_STATUS,
      );
    }
    return crmAccessService.updateMembership(
      platformOrganization,
      actingMembershipId,
      membershipId,
      input,
      CO_FOUNDER_ACTING_GRANT,
    );
  },
};
