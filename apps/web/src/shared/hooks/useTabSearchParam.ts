"use client";

import { useSearchParams } from "next/navigation";

import { usePendingSelection } from "./usePendingSelection";

export const TAB_SEARCH_PARAM = "tab";

const NO_TAB_IN_URL = "";

const findTab = <TabValue extends string>(
  tabValues: readonly TabValue[],
  candidate: string | null,
): TabValue | undefined => tabValues.find((tabValue) => tabValue === candidate);

export const useTabSearchParam = <TabValue extends string>(
  tabValues: readonly TabValue[],
  defaultTab: TabValue,
  paramName: string = TAB_SEARCH_PARAM,
) => {
  const searchParams = useSearchParams();
  const tabInUrl = searchParams.get(paramName);
  const { pendingValue: pendingTab, markPending: markTabPending } = usePendingSelection<TabValue>(
    tabInUrl ?? NO_TAB_IN_URL,
  );
  const selectedTab = pendingTab ?? findTab(tabValues, tabInUrl) ?? defaultTab;

  const selectTab = (requestedTab: string) => {
    const nextTab = findTab(tabValues, requestedTab);
    if (nextTab === undefined) return;
    markTabPending(nextTab);
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set(paramName, nextTab);
    const { pathname, hash } = window.location;
    window.history.replaceState(
      window.history.state,
      "",
      `${pathname}?${nextParams.toString()}${hash}`,
    );
  };

  return { selectedTab, selectTab };
};
