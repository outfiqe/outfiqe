import { UserRole } from "#generated/prisma/enums.js";
import { crmAccessRepository } from "#modules/crm-access/crm-access.repository.js";

import {
  isPlatformPermissionKey,
  PLATFORM_PERMISSION_KEYS,
  type PlatformPermissionKey,
} from "./platform-access.constants.js";

const ACTIVE_MEMBERSHIP_STATUS = "ACTIVE";

export const platformAccessService = {
  async permissionKeysFor(userId: string): Promise<PlatformPermissionKey[]> {
    const platformOrganization = await crmAccessRepository.findPlatformOrganization();
    if (!platformOrganization) return [];

    const membership = await crmAccessRepository.findMembershipByUserAndOrg(
      userId,
      platformOrganization.id,
    );
    if (!membership || membership.status !== ACTIVE_MEMBERSHIP_STATUS) return [];

    const isSuperAdmin = platformOrganization.superAdminMembershipId === membership.id;
    if (isSuperAdmin) return [...PLATFORM_PERMISSION_KEYS];

    return membership.role.permissionKeys.filter(isPlatformPermissionKey);
  },

  async principalHasPermission(
    principal: { userId: string; role: UserRole },
    key: PlatformPermissionKey,
  ): Promise<boolean> {
    if (principal.role !== UserRole.ADMIN) return false;
    const permissionKeys = await platformAccessService.permissionKeysFor(principal.userId);
    return permissionKeys.includes(key);
  },
};
