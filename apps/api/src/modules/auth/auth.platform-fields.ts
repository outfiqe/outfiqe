import { findInaccessiblePlatformSections, isStaffUserRole } from "@outfiqe/utils";

import { UserRole } from "#generated/prisma/enums.js";
import { crmAccessService } from "#modules/crm-access/crm-access.service.js";
import { platformAccessService } from "#modules/platform-access/platform-access.service.js";
import { platformNavAccessService } from "#modules/platform-nav-access/platform-nav-access.service.js";

import type { PlatformNavAccessFields } from "./auth.types.js";

const NO_PLATFORM_SESSION_FIELDS: PlatformNavAccessFields = {
  hasPlatformAccess: false,
  isCoFounder: false,
  hiddenPlatformNavKeys: [],
  platformPermissionKeys: [],
  crmHomeSubdomain: null,
};

export const resolvePlatformFields = async (
  userId: string,
  role: UserRole,
): Promise<PlatformNavAccessFields> => {
  if (!isStaffUserRole(role)) return NO_PLATFORM_SESSION_FIELDS;

  const tenantHome = async (): Promise<PlatformNavAccessFields> => ({
    ...NO_PLATFORM_SESSION_FIELDS,
    crmHomeSubdomain: await crmAccessService.findHomeTenantSubdomain(userId),
  });
  if (role !== UserRole.ADMIN) return tenantHome();

  const platformAccess = await platformAccessService.resolveAccess(userId);
  if (!platformAccess.hasStaffAccess) return tenantHome();

  const { isCoFounder, hiddenNavKeys } = await platformNavAccessService.resolveFor(userId);
  const sectionsHiddenByRole = findInaccessiblePlatformSections({
    isCoFounder,
    permissionKeys: platformAccess.permissionKeys,
  });

  return {
    hasPlatformAccess: true,
    isCoFounder,
    hiddenPlatformNavKeys: [...new Set([...hiddenNavKeys, ...sectionsHiddenByRole])],
    platformPermissionKeys: platformAccess.permissionKeys,
    crmHomeSubdomain: null,
  };
};
