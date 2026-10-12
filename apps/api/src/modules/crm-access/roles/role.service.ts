import { HTTP_STATUS } from "#constants/http.constants.js";
import { isForeignKeyConstraintError, isUniqueConstraintError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { assertPermissionKeysWithinActorGrant } from "../crm-access.guards.js";
import type {
  ActingPermissionGrant,
  PermissionRecord,
  RoleWithPermissions,
  UpdateRoleInput,
} from "../crm-access.types.js";
import { canDeleteRole, findUnselectablePermissionKeys } from "../crm-access.utils.js";
import { crmRoleRepository } from "./role.repository.js";

const assertPermissionKeysSelectable = (permissionKeys: string[]): void => {
  const unselectable = findUnselectablePermissionKeys(permissionKeys);
  if (unselectable.length > 0) {
    throw new AppError(
      "INVALID_PERMISSION_KEYS",
      "One or more of the selected permissions can't be granted to a custom role.",
      HTTP_STATUS.BAD_REQUEST,
    );
  }
};

const asRoleNameConflict = (err: unknown): unknown =>
  isUniqueConstraintError(err)
    ? new AppError("ROLE_NAME_TAKEN", "A role with that name already exists.", HTTP_STATUS.CONFLICT)
    : err;

export const crmRoleService = {
  async listPermissions(): Promise<PermissionRecord[]> {
    return crmRoleRepository.listPermissions();
  },

  async listRoles(organizationId: string): Promise<RoleWithPermissions[]> {
    return crmRoleRepository.listRoles(organizationId);
  },

  async createRole(
    organizationId: string,
    input: { name: string; permissionKeys: string[] },
    actingGrant: ActingPermissionGrant,
  ): Promise<RoleWithPermissions> {
    assertPermissionKeysSelectable(input.permissionKeys);
    assertPermissionKeysWithinActorGrant(input.permissionKeys, actingGrant);
    try {
      return await crmRoleRepository.createRole({
        organizationId,
        name: input.name,
        isBuiltIn: false,
        permissionKeys: input.permissionKeys,
      });
    } catch (err) {
      throw asRoleNameConflict(err);
    }
  },

  async updateRole(
    organizationId: string,
    roleId: string,
    input: UpdateRoleInput,
    actingGrant: ActingPermissionGrant,
  ): Promise<RoleWithPermissions> {
    const role = await crmRoleRepository.findRoleById(organizationId, roleId);
    if (!role) {
      throw new AppError("ROLE_NOT_FOUND", "Role not found.", HTTP_STATUS.NOT_FOUND);
    }
    if (role.isBuiltIn) {
      throw new AppError(
        "ROLE_IS_BUILT_IN",
        "Built-in roles can't be edited.",
        HTTP_STATUS.FORBIDDEN,
      );
    }
    if (input.permissionKeys !== undefined) {
      assertPermissionKeysSelectable(input.permissionKeys);
      const permissionsNewlyGranted = input.permissionKeys.filter(
        (key) => !role.permissionKeys.includes(key),
      );
      assertPermissionKeysWithinActorGrant(permissionsNewlyGranted, actingGrant);
    }

    try {
      return await crmRoleRepository.updateRole(organizationId, roleId, input);
    } catch (err) {
      throw asRoleNameConflict(err);
    }
  },

  async deleteRole(organizationId: string, roleId: string): Promise<void> {
    const role = await crmRoleRepository.findRoleById(organizationId, roleId);
    if (!role) {
      throw new AppError("ROLE_NOT_FOUND", "Role not found.", HTTP_STATUS.NOT_FOUND);
    }
    if (role.isBuiltIn) {
      throw new AppError(
        "ROLE_IS_BUILT_IN",
        "Built-in roles can't be deleted.",
        HTTP_STATUS.FORBIDDEN,
      );
    }

    const memberCount = await crmRoleRepository.countMembershipsForRole(organizationId, roleId);
    if (!canDeleteRole(role, memberCount)) {
      throw new AppError(
        "ROLE_IN_USE",
        "Reassign every member on this role before deleting it.",
        HTTP_STATUS.CONFLICT,
      );
    }

    try {
      await crmRoleRepository.deleteRole(organizationId, roleId);
    } catch (err) {
      if (isForeignKeyConstraintError(err)) {
        throw new AppError(
          "ROLE_IN_USE",
          "Reassign every member on this role before deleting it.",
          HTTP_STATUS.CONFLICT,
        );
      }
      throw err;
    }
  },
};
