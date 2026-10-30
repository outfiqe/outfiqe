import type { SidebarNavItem, SidebarNavSection } from "@outfiqe/components";

import type { AdminUser } from "@/features/auth/api/authSchemas";
import { canOpenPlatformOverview } from "@/lib/platformPermissions";

import type { CrmOrganizationContext } from "./AdminSidebar.utils";
import {
  groupPlatformNavItems,
  isCrmSubItemVisible,
  shouldShowCrmSection,
  shouldShowPlatformSection,
} from "./AdminSidebar.utils";
import {
  CRM_SUB_ITEMS,
  PLATFORM_NAV_GROUP_ICONS,
  PLATFORM_NAV_ITEMS,
  PLATFORM_OVERVIEW_NAV_ITEM,
  toNavItem,
} from "./adminSidebarNavItems";

const listPlatformNavItems = (user: AdminUser | null): SidebarNavItem[] => [
  ...(user && canOpenPlatformOverview(user) ? [PLATFORM_OVERVIEW_NAV_ITEM] : []),
  ...groupPlatformNavItems(
    PLATFORM_NAV_ITEMS,
    { isCoFounder: user?.isCoFounder ?? false, hiddenNavKeys: user?.hiddenPlatformNavKeys ?? [] },
    PLATFORM_NAV_GROUP_ICONS,
  ),
];

export const buildAdminNavSections = (
  user: AdminUser | null,
  crmOrganization: CrmOrganizationContext | undefined,
): SidebarNavSection[] => {
  const visibleCrmItems = CRM_SUB_ITEMS.filter((crmItem) =>
    isCrmSubItemVisible(crmItem, crmOrganization),
  ).map(toNavItem);

  return [
    ...(shouldShowCrmSection(crmOrganization)
      ? [{ id: "crm", label: "CRM", items: visibleCrmItems }]
      : []),
    ...(shouldShowPlatformSection(user?.hasPlatformAccess ?? false, crmOrganization)
      ? [{ id: "platform", label: "Platform", items: listPlatformNavItems(user) }]
      : []),
  ];
};
