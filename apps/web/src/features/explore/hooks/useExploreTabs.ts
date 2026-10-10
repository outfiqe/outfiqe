"use client";

import { useFeatureFlag } from "@/shared/hooks/useFeatureFlag";

import {
  BUILDS_EXPLORE_TAB,
  EXPLORE_FIXED_TABS,
  type ExploreFixedTab,
} from "../constants/explore.constants";

export const useExploreTabs = (): ExploreFixedTab[] => {
  const isPublicBuildsOn = useFeatureFlag("outfit_public_feed");
  return isPublicBuildsOn ? [...EXPLORE_FIXED_TABS, BUILDS_EXPLORE_TAB] : EXPLORE_FIXED_TABS;
};
