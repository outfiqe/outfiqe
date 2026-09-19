import { useRouterState } from "@tanstack/react-router";

import { PagePendingSkeleton } from "../PagePendingSkeleton";
import { DashboardPageSkeleton } from "./DashboardPageSkeleton";
import { DetailFormPageSkeleton } from "./DetailFormPageSkeleton";
import { KanbanPageSkeleton } from "./KanbanPageSkeleton";
import { ListPageSkeleton } from "./ListPageSkeleton";
import { PAGE_SKELETON_KIND, resolvePageSkeletonKind } from "./resolvePageSkeletonKind";

const SKELETON_BY_KIND = {
  [PAGE_SKELETON_KIND.DASHBOARD]: DashboardPageSkeleton,
  [PAGE_SKELETON_KIND.LIST]: ListPageSkeleton,
  [PAGE_SKELETON_KIND.KANBAN]: KanbanPageSkeleton,
  [PAGE_SKELETON_KIND.DETAIL_FORM]: DetailFormPageSkeleton,
  [PAGE_SKELETON_KIND.GENERIC]: PagePendingSkeleton,
};

export const RoutePendingSkeleton = () => {
  const pathname = useRouterState({ select: (routerState) => routerState.location.pathname });
  const PageSkeleton = SKELETON_BY_KIND[resolvePageSkeletonKind(pathname)];

  return <PageSkeleton />;
};
