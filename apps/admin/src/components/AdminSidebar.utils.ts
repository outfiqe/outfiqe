import type { SidebarIcon, SidebarNavItem } from "@outfiqe/components";
import type { PlatformNavKey } from "@outfiqe/utils";

type CrmItemVisibilityRules = {
  permissionKey: string | null;
  requiresLinkedBrand?: boolean;
};

type CrmOrganizationQueryStatus = "pending" | "error" | "success";

export const isAdminNavReady = (
  isAuthResolved: boolean,
  crmOrganizationQueryStatus: CrmOrganizationQueryStatus,
): boolean => isAuthResolved && crmOrganizationQueryStatus !== "pending";

export const PLATFORM_NAV_GROUP_ORDER = [
  "brand-tenants",
  "catalog",
  "commerce",
  "moderation",
  "finance",
  "growth",
  "platform-settings",
] as const;

export type PlatformNavGroupKey = (typeof PLATFORM_NAV_GROUP_ORDER)[number];

export const PLATFORM_NAV_GROUP_LABELS: Record<PlatformNavGroupKey, string> = {
  "brand-tenants": "Brand & Tenants",
  catalog: "Catalog",
  commerce: "Commerce",
  moderation: "Moderation & Support",
  finance: "Finance",
  growth: "Growth",
  "platform-settings": "Platform Settings",
};

export type PlatformNavItem = Omit<SidebarNavItem, "id"> & {
  id: PlatformNavKey;
  group: PlatformNavGroupKey;
  coFounderOnly?: boolean;
};

type PlatformNavViewer = {
  isCoFounder: boolean;
  hiddenNavKeys: string[];
};

const isPlatformNavItemVisible = (item: PlatformNavItem, viewer: PlatformNavViewer): boolean => {
  if (item.coFounderOnly && !viewer.isCoFounder) return false;
  if (viewer.isCoFounder) return true;
  return !viewer.hiddenNavKeys.includes(item.id);
};

const toSidebarNavItem = ({
  coFounderOnly: _coFounderOnly,
  group: _group,
  ...item
}: PlatformNavItem): SidebarNavItem => item;

export const groupPlatformNavItems = (
  items: readonly PlatformNavItem[],
  viewer: PlatformNavViewer,
  groupIcons: Readonly<Record<PlatformNavGroupKey, SidebarIcon>>,
): SidebarNavItem[] => {
  const visibleItems = items.filter((item) => isPlatformNavItemVisible(item, viewer));

  return PLATFORM_NAV_GROUP_ORDER.reduce<SidebarNavItem[]>((groups, groupKey) => {
    const groupItems = visibleItems.filter((item) => item.group === groupKey).map(toSidebarNavItem);

    if (groupItems.length === 0) return groups;

    groups.push({
      id: `platform-group-${groupKey}`,
      label: PLATFORM_NAV_GROUP_LABELS[groupKey],
      href: groupItems[0].href,
      icon: groupIcons[groupKey],
      items: groupItems,
    });
    return groups;
  }, []);
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

const PLATFORM_STAFF_ACCOUNT_LABEL = "Admin account";

export const resolveAccountLabel = (viewer: {
  hasPlatformAccess: boolean;
  crmRoleName: string | undefined;
}): string => {
  if (viewer.hasPlatformAccess) return PLATFORM_STAFF_ACCOUNT_LABEL;
  return viewer.crmRoleName ?? PLATFORM_STAFF_ACCOUNT_LABEL;
};

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
