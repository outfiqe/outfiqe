type CrmItemVisibilityRules = {
  permissionKey: string | null;
  requiresLinkedBrand?: boolean;
};

type CrmOrganizationContext = {
  viewerIsSuperAdmin: boolean;
  viewerPermissionKeys: string[];
  linkedBrandId: string | null;
};

export const shouldShowCrmSection = (
  crmOrganization: { isPlatformOrg?: boolean } | undefined,
): boolean => crmOrganization?.isPlatformOrg !== true;

export const shouldShowPlatformSection = (
  hasPlatformAccess: boolean,
  crmOrganization: { isPlatformOrg?: boolean } | undefined,
): boolean => hasPlatformAccess && crmOrganization?.isPlatformOrg !== false;

export const isCrmSubItemVisible = (
  item: CrmItemVisibilityRules,
  crmOrganization: CrmOrganizationContext | undefined,
): boolean => {
  if (item.requiresLinkedBrand && crmOrganization && crmOrganization.linkedBrandId === null) {
    return false;
  }
  if (item.permissionKey === null) return true;
  if (!crmOrganization) return true;
  return (
    crmOrganization.viewerIsSuperAdmin ||
    crmOrganization.viewerPermissionKeys.includes(item.permissionKey)
  );
};
