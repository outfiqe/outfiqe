import type { SidebarIcon, SidebarNavItem } from "@outfiqe/components";
import type { PlatformNavKey } from "@outfiqe/utils";

type CrmItemVisibilityRules = {
  permissionKey: string | null;
  requiresLinkedBrand?: boolean;
};

export const isAdminNavReady = (
  isAuthResolved: boolean,
  hasCrmOrganizationAnswered: boolean,
): boolean => isAuthResolved && hasCrmOrganizationAnswered;

export const shouldRefetchCrmOrganizationOnFocus = (query: {
  state: { status: "pending" | "error" | "success" };
}): boolean => query.state.status !== "error";

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

export const isPlatformNavItemVisible = (
  navItem: PlatformNavItem,
  viewer: PlatformNavViewer,
): boolean => {
  if (navItem.coFounderOnly && !viewer.isCoFounder) return false;
  if (viewer.isCoFounder) return true;
  return !viewer.hiddenNavKeys.includes(navItem.id);
};

const pathBelongsToHref = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);

export const findPlatformNavItemForPath = (
  navItems: readonly PlatformNavItem[],
  pathname: string,
): PlatformNavItem | undefined =>
  navItems
    .filter((navItem) => pathBelongsToHref(pathname, navItem.href))
    .sort((longer, shorter) => shorter.href.length - longer.href.length)[0];

export const findFirstVisiblePlatformHref = (
  navItems: readonly PlatformNavItem[],
  viewer: PlatformNavViewer,
): string | undefined => {
  for (const groupKey of PLATFORM_NAV_GROUP_ORDER) {
    const firstVisibleItem = navItems.find(
      (navItem) => navItem.group === groupKey && isPlatformNavItemVisible(navItem, viewer),
    );
    if (firstVisibleItem) return firstVisibleItem.href;
  }
  return undefined;
};

const toSidebarNavItem = ({
  coFounderOnly: _coFounderOnly,
  group: _group,
  ...navItem
}: PlatformNavItem): SidebarNavItem => navItem;

export const groupPlatformNavItems = (
  navItems: readonly PlatformNavItem[],
  viewer: PlatformNavViewer,
  groupIcons: Readonly<Record<PlatformNavGroupKey, SidebarIcon>>,
): SidebarNavItem[] => {
  const visibleItems = navItems.filter((navItem) => isPlatformNavItemVisible(navItem, viewer));

  return PLATFORM_NAV_GROUP_ORDER.reduce<SidebarNavItem[]>((groups, groupKey) => {
    const groupItems = visibleItems
      .filter((navItem) => navItem.group === groupKey)
      .map(toSidebarNavItem);
    const [firstGroupItem] = groupItems;

    if (!firstGroupItem) return groups;

    groups.push({
      id: `platform-group-${groupKey}`,
      label: PLATFORM_NAV_GROUP_LABELS[groupKey],
      href: firstGroupItem.href,
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
): boolean => crmOrganization !== undefined && crmOrganization.isPlatformOrg !== true;

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
  crmItem: CrmItemVisibilityRules,
  crmOrganization: CrmOrganizationContext | undefined,
): boolean => {
  if (!crmOrganization) return false;
  if (crmItem.requiresLinkedBrand && crmOrganization.linkedBrandId === null) return false;
  if (crmItem.permissionKey === null) return true;
  return (
    crmOrganization.viewerIsSuperAdmin ||
    crmOrganization.viewerPermissionKeys.includes(crmItem.permissionKey)
  );
};
