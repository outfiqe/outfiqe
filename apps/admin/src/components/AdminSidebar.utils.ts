import type { SidebarNavItem } from "@outfiqe/components";
import type { PlatformNavKey } from "@outfiqe/utils";

type CrmItemVisibilityRules = {
  permissionKey: string | null;
  requiresLinkedBrand?: boolean;
};

export type PlatformNavItem = Omit<SidebarNavItem, "id"> & {
  id: PlatformNavKey;
  coFounderOnly?: boolean;
};

type PlatformNavViewer = {
  isCoFounder: boolean;
  hiddenNavKeys: string[];
};

export const visiblePlatformNavItems = (
  items: PlatformNavItem[],
  viewer: PlatformNavViewer,
): SidebarNavItem[] =>
  items
    .filter((item) => {
      if (item.coFounderOnly && !viewer.isCoFounder) return false;
      if (viewer.isCoFounder) return true;
      return !viewer.hiddenNavKeys.includes(item.id);
    })
    .map(({ coFounderOnly: _coFounderOnly, ...item }) => item);

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
