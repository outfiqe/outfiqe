import {
  Sidebar,
  SidebarSkeleton,
  sidebarWidthClass,
  useSidebarCollapse,
} from "@outfiqe/components";
import { cn } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/components/AuthContext";
import { crmApi } from "@/features/crm/api/crmApi";
import { CRM_ORGANIZATION_STALE_TIME_MS } from "@/features/crm/constants/crmOrganizationQuery";

import { buildAdminNavSections } from "./adminNavSections";
import {
  isAdminNavReady,
  resolveAccountLabel,
  shouldRefetchCrmOrganizationOnFocus,
} from "./AdminSidebar.utils";
import { AdminSidebarAccount } from "./AdminSidebarAccount";
import { useTanStackSidebarNavigation } from "./useTanStackSidebarNavigation";

const SIDEBAR_SKELETON_ROW_COUNT = 8;
const SIDEBAR_ARIA_LABEL = "Admin";
const SIDEBAR_COLLAPSE_STORAGE_KEY = "outfiqe:admin-sidebar-collapsed";

export const AdminSidebar = () => {
  const { state } = useAuth();
  const navigation = useTanStackSidebarNavigation();
  const { collapsed, toggle } = useSidebarCollapse(SIDEBAR_COLLAPSE_STORAGE_KEY);

  const { data: crmOrganization, isFetched: hasCrmOrganizationAnswered } = useQuery({
    queryKey: ["crm-organization"],
    queryFn: crmApi.getOrganization,
    retry: false,
    staleTime: CRM_ORGANIZATION_STALE_TIME_MS,
    refetchOnWindowFocus: shouldRefetchCrmOrganizationOnFocus,
  });

  if (!isAdminNavReady(state.status !== "loading", hasCrmOrganizationAnswered)) {
    return (
      <SidebarSkeleton
        ariaLabel={SIDEBAR_ARIA_LABEL}
        collapsed={collapsed}
        rowCount={SIDEBAR_SKELETON_ROW_COUNT}
        className={cn("shrink-0", sidebarWidthClass(collapsed))}
      />
    );
  }

  const user = state.status === "signed-in" ? state.user : null;
  const navSections = buildAdminNavSections(user, crmOrganization);
  const accountLabel = resolveAccountLabel({
    hasPlatformAccess: user?.hasPlatformAccess ?? false,
    crmRoleName: crmOrganization?.viewerRoleName,
  });

  return (
    <Sidebar
      sections={navSections}
      navigation={navigation}
      ariaLabel={SIDEBAR_ARIA_LABEL}
      collapsed={collapsed}
      onToggleCollapse={toggle}
      header={
        user && (
          <AdminSidebarAccount
            user={user}
            accountLabel={accountLabel}
            collapsed={collapsed}
            navSections={navSections}
          />
        )
      }
      className={`shrink-0 ${sidebarWidthClass(collapsed)}`}
    />
  );
};
