import {
  Sidebar,
  type SidebarNavItem,
  type SidebarNavSection,
  SidebarSkeleton,
  sidebarWidthClass,
  useSidebarCollapse,
} from "@outfiqe/components";
import { Badge, cn } from "@outfiqe/design-system";
import { getAvatarColor, initialsFor } from "@outfiqe/utils";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/components/AuthContext";
import { crmApi } from "@/features/crm/api/crmApi";
import { canOpenPlatformOverview } from "@/lib/platformPermissions";

import { AdminModuleSearch } from "./AdminModuleSearch";
import {
  groupPlatformNavItems,
  isAdminNavReady,
  isCrmSubItemVisible,
  resolveAccountLabel,
  shouldRefetchCrmOrganizationOnFocus,
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
import { useTanStackSidebarNavigation } from "./useTanStackSidebarNavigation";

const SIDEBAR_SKELETON_ROW_COUNT = 8;

export const AdminSidebar = () => {
  const { state } = useAuth();
  const navigation = useTanStackSidebarNavigation();
  const { collapsed, toggle } = useSidebarCollapse("outfiqe:admin-sidebar-collapsed");

  const { data: crmOrganization, isFetched: hasCrmOrganizationAnswered } = useQuery({
    queryKey: ["crm-organization"],
    queryFn: crmApi.getOrganization,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: shouldRefetchCrmOrganizationOnFocus,
  });

  if (!isAdminNavReady(state.status !== "loading", hasCrmOrganizationAnswered)) {
    return (
      <SidebarSkeleton
        ariaLabel="Admin"
        collapsed={collapsed}
        rowCount={SIDEBAR_SKELETON_ROW_COUNT}
        className={cn("shrink-0", sidebarWidthClass(collapsed))}
      />
    );
  }

  const visibleCrmItems = CRM_SUB_ITEMS.filter((item) =>
    isCrmSubItemVisible(item, crmOrganization),
  ).map(toNavItem);

  const user = state.status === "signed-in" ? state.user : null;
  const isCoFounder = user?.isCoFounder ?? false;
  const accountLabel = resolveAccountLabel({
    hasPlatformAccess: user?.hasPlatformAccess ?? false,
    crmRoleName: crmOrganization?.viewerRoleName,
  });
  const platformNavItems: SidebarNavItem[] = [
    ...(user && canOpenPlatformOverview(user) ? [PLATFORM_OVERVIEW_NAV_ITEM] : []),
    ...groupPlatformNavItems(
      PLATFORM_NAV_ITEMS,
      { isCoFounder, hiddenNavKeys: user?.hiddenPlatformNavKeys ?? [] },
      PLATFORM_NAV_GROUP_ICONS,
    ),
  ];
  const navSections: SidebarNavSection[] = [
    ...(shouldShowCrmSection(crmOrganization)
      ? [{ id: "crm", label: "CRM", items: visibleCrmItems }]
      : []),
    ...(shouldShowPlatformSection(user?.hasPlatformAccess ?? false, crmOrganization)
      ? [{ id: "platform", label: "Platform", items: platformNavItems }]
      : []),
  ];

  const header = user && (
    <div className={cn("flex min-w-0 flex-1 flex-col gap-3", collapsed && "items-center")}>
      <div className={cn("flex min-w-0 items-center gap-2.5", collapsed && "justify-center")}>
        <div className="size-9 shrink-0 overflow-hidden rounded-full">
          <div
            className="flex size-full items-center justify-center bg-cover bg-center"
            style={user.avatarUrl ? { backgroundImage: `url(${user.avatarUrl})` } : undefined}
          >
            {!user.avatarUrl && (
              <span
                aria-hidden
                className="flex size-full items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: getAvatarColor(user.id) }}
              >
                {initialsFor(user.name)}
              </span>
            )}
          </div>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground" title={user.name}>
              {user.name}
            </p>
            {isCoFounder ? (
              <Badge tone="positive" showDot={false} className="mt-1 px-2 py-0.5 text-[10px]">
                Co-founder
              </Badge>
            ) : (
              <p className="truncate text-[11px] text-muted-foreground" title={accountLabel}>
                {accountLabel}
              </p>
            )}
          </div>
        )}
      </div>
      {!collapsed && <AdminModuleSearch sections={navSections} />}
    </div>
  );

  return (
    <Sidebar
      sections={navSections}
      navigation={navigation}
      ariaLabel="Admin"
      collapsed={collapsed}
      onToggleCollapse={toggle}
      header={header}
      className={`shrink-0 ${sidebarWidthClass(collapsed)}`}
    />
  );
};
