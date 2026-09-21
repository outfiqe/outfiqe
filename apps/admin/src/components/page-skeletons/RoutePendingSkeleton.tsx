import { useRouterState } from "@tanstack/react-router";

import {
  AuditRouteSkeleton,
  BillingRouteSkeleton,
  ContactsRouteSkeleton,
  CustomerDetailRouteSkeleton,
  CustomersRouteSkeleton,
  PartnerDetailRouteSkeleton,
  PartnersRouteSkeleton,
  PipelineRouteSkeleton,
  ReportsRouteSkeleton,
  RolesRouteSkeleton,
  TasksRouteSkeleton,
  TicketsRouteSkeleton,
} from "@/features/crm/skeletons";
import { BadgeFormSkeleton } from "@/features/gamification/BadgesSection/BadgeFormSkeleton";
import { OrderDetailSkeleton } from "@/features/orders/OrderDetailSkeleton";
import { TenantMetricsSkeleton } from "@/features/platform-metrics/TenantMetricsSkeleton";
import { SupportTicketSkeleton } from "@/features/support/SupportTicketSkeleton";

import { PagePendingSkeleton } from "../PagePendingSkeleton";
import { AdminPageSkeleton } from "./AdminPageSkeleton";
import { DashboardPageSkeleton } from "./DashboardPageSkeleton";
import { DetailFormPageSkeleton } from "./DetailFormPageSkeleton";
import { KanbanPageSkeleton } from "./KanbanPageSkeleton";
import { ListPageSkeleton } from "./ListPageSkeleton";
import { resolveAdminPageSkeletonSpec } from "./resolveAdminPageSkeleton";
import { CRM_ROUTE_SKELETON_KEY, resolveCrmRouteSkeletonKey } from "./resolveCrmRouteSkeleton";
import {
  DETAIL_ROUTE_SKELETON_KEY,
  resolveDetailRouteSkeletonKey,
} from "./resolveDetailRouteSkeleton";
import { PAGE_SKELETON_KIND, resolvePageSkeletonKind } from "./resolvePageSkeletonKind";

const SKELETON_BY_KIND = {
  [PAGE_SKELETON_KIND.DASHBOARD]: DashboardPageSkeleton,
  [PAGE_SKELETON_KIND.LIST]: ListPageSkeleton,
  [PAGE_SKELETON_KIND.KANBAN]: KanbanPageSkeleton,
  [PAGE_SKELETON_KIND.DETAIL_FORM]: DetailFormPageSkeleton,
  [PAGE_SKELETON_KIND.GENERIC]: PagePendingSkeleton,
};

const SKELETON_BY_CRM_ROUTE = {
  [CRM_ROUTE_SKELETON_KEY.AUDIT]: AuditRouteSkeleton,
  [CRM_ROUTE_SKELETON_KEY.BILLING]: BillingRouteSkeleton,
  [CRM_ROUTE_SKELETON_KEY.CONTACTS]: ContactsRouteSkeleton,
  [CRM_ROUTE_SKELETON_KEY.CUSTOMERS]: CustomersRouteSkeleton,
  [CRM_ROUTE_SKELETON_KEY.CUSTOMER_DETAIL]: CustomerDetailRouteSkeleton,
  [CRM_ROUTE_SKELETON_KEY.PARTNERS]: PartnersRouteSkeleton,
  [CRM_ROUTE_SKELETON_KEY.PARTNER_DETAIL]: PartnerDetailRouteSkeleton,
  [CRM_ROUTE_SKELETON_KEY.PIPELINE]: PipelineRouteSkeleton,
  [CRM_ROUTE_SKELETON_KEY.REPORTS]: ReportsRouteSkeleton,
  [CRM_ROUTE_SKELETON_KEY.ROLES]: RolesRouteSkeleton,
  [CRM_ROUTE_SKELETON_KEY.SUPPORT]: TicketsRouteSkeleton,
  [CRM_ROUTE_SKELETON_KEY.TASKS]: TasksRouteSkeleton,
};

const SKELETON_BY_DETAIL_ROUTE = {
  [DETAIL_ROUTE_SKELETON_KEY.ORDER]: OrderDetailSkeleton,
  [DETAIL_ROUTE_SKELETON_KEY.SUPPORT_TICKET]: SupportTicketSkeleton,
  [DETAIL_ROUTE_SKELETON_KEY.TENANT_METRICS]: TenantMetricsSkeleton,
  [DETAIL_ROUTE_SKELETON_KEY.BADGE_FORM]: BadgeFormSkeleton,
};

export const RoutePendingSkeleton = () => {
  const pathname = useRouterState({ select: (routerState) => routerState.location.pathname });
  const crmRouteKey = resolveCrmRouteSkeletonKey(pathname);
  const detailRouteKey = resolveDetailRouteSkeletonKey(pathname);
  if (!crmRouteKey && detailRouteKey) {
    const DetailSkeleton = SKELETON_BY_DETAIL_ROUTE[detailRouteKey];
    return <DetailSkeleton />;
  }
  const adminPageSpec = resolveAdminPageSkeletonSpec(pathname);
  if (!crmRouteKey && adminPageSpec) return <AdminPageSkeleton spec={adminPageSpec} />;

  const PageSkeleton = crmRouteKey
    ? SKELETON_BY_CRM_ROUTE[crmRouteKey]
    : SKELETON_BY_KIND[resolvePageSkeletonKind(pathname)];

  return <PageSkeleton />;
};
