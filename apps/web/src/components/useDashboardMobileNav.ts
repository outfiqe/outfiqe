"use client";

import type { SidebarNavItem } from "@outfiqe/components";

import { resolvePinnedIds } from "./dashboardMobileNav";
import { useDashboardNav } from "./useDashboardNav";
import { useNavPreferences } from "./useNavPreferences";

type DashboardMobileNav = {
  pinnedItems: SidebarNavItem[];
  overflowItems: SidebarNavItem[];
  allItems: SidebarNavItem[];
  savePins: (ids: string[]) => void;
  resetPins: () => void;
  accountLabel: string;
};

export const useDashboardMobileNav = (): DashboardMobileNav => {
  const { navItems, accountLabel } = useDashboardNav();
  const { pinnedIds, save, reset } = useNavPreferences();

  const itemById = new Map(navItems.map((navItem) => [navItem.id, navItem]));
  const resolvedIds = resolvePinnedIds(navItems, pinnedIds);
  const pinnedIdSet = new Set(resolvedIds);

  const pinnedItems = resolvedIds
    .map((id) => itemById.get(id))
    .filter((navItem): navItem is SidebarNavItem => navItem !== undefined);
  const overflowItems = navItems.filter((navItem) => !pinnedIdSet.has(navItem.id));

  return {
    pinnedItems,
    overflowItems,
    allItems: navItems,
    savePins: save,
    resetPins: reset,
    accountLabel,
  };
};
