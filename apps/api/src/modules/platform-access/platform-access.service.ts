import { UserRole } from "#generated/prisma/enums.js";
import { PLATFORM_ACCESS_PERMISSION_KEY } from "#modules/crm-access/crm-access.constants.js";
import { crmAccessRepository } from "#modules/crm-access/crm-access.repository.js";

import {
  isPlatformPermissionKey,
  PLATFORM_PERMISSION_KEYS,
  type PlatformPermissionKey,
} from "./platform-access.constants.js";
import type { PlatformAccess } from "./platform-access.types.js";

const ACTIVE_MEMBERSHIP_STATUS = "ACTIVE";

const NO_PLATFORM_ACCESS: PlatformAccess = {
  hasStaffAccess: false,
  hasFullAccess: false,
  permissionKeys: [],
};

export const platformAccessService = {
  async resolveAccess(userId: string): Promise<PlatformAccess> {
    const platformOrganization = await crmAccessRepository.findPlatformOrganization();
    if (!platformOrganization) return NO_PLATFORM_ACCESS;

    const membership = await crmAccessRepository.findMembershipByUserAndOrg(
      userId,
      platformOrganization.id,
    );
    if (!membership || membership.status !== ACTIVE_MEMBERSHIP_STATUS) return NO_PLATFORM_ACCESS;

    const hasFullAccess =
      platformOrganization.superAdminMembershipId === membership.id ||
      membership.isPlatformSuperAdmin;
    if (hasFullAccess) {
      return { hasStaffAccess: true, hasFullAccess, permissionKeys: [...PLATFORM_PERMISSION_KEYS] };
    }

    const { permissionKeys: roleKeys } = membership.role;
    const permissionKeys = roleKeys.filter(isPlatformPermissionKey);
    const holdsLegacyAccessKey = roleKeys.includes(PLATFORM_ACCESS_PERMISSION_KEY);

    return {
      hasStaffAccess: permissionKeys.length > 0 || holdsLegacyAccessKey,
      hasFullAccess,
      permissionKeys,
    };
  },

  async permissionKeysFor(userId: string): Promise<PlatformPermissionKey[]> {
    const { permissionKeys } = await platformAccessService.resolveAccess(userId);
    return permissionKeys;
  },

  async principalHasPermission(
    principal: { userId: string; role: UserRole },
    key: PlatformPermissionKey,
  ): Promise<boolean> {
    if (principal.role !== UserRole.ADMIN) return false;
    const permissionKeys = await platformAccessService.permissionKeysFor(principal.userId);
    return permissionKeys.includes(key);
  },

  async findUserIdsHoldingAnyPermission(keys: readonly PlatformPermissionKey[]): Promise<string[]> {
    const platformOrganization = await crmAccessRepository.findPlatformOrganization();
    if (!platformOrganization) return [];

    return crmAccessRepository.findActiveMemberUserIdsHoldingAnyPermission(
      platformOrganization,
      keys,
    );
  },
};
