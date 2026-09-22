import { PLATFORM_NAV_GROUP_ICONS, PLATFORM_NAV_ITEMS } from "@/components/AdminSidebar";
import { groupPlatformNavItems } from "@/components/AdminSidebar.utils";

import type { PlatformTourStep } from "../constants/platformDashboardTour";

export type PlatformTourViewer = {
  isCoFounder: boolean;
  hiddenNavKeys: string[];
};

export const visiblePlatformTourSteps = (
  steps: readonly PlatformTourStep[],
  viewer: PlatformTourViewer,
): PlatformTourStep[] => {
  const visibleGroupIds = new Set(
    groupPlatformNavItems(PLATFORM_NAV_ITEMS, viewer, PLATFORM_NAV_GROUP_ICONS).map(
      (group) => group.id,
    ),
  );

  return steps.filter(
    (step) => step.groupKey === null || visibleGroupIds.has(`platform-group-${step.groupKey}`),
  );
};
