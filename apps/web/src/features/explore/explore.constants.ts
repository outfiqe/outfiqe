import { Home, LayoutGrid, Rows3, TrendingUp, Users } from "lucide-react";
import type { ComponentType } from "react";

export const EXPLORE_QUERY_PARAM = {
  TAB: "tab",
  LAYOUT: "layout",
} as const;

export type ExploreQueryParamKey = (typeof EXPLORE_QUERY_PARAM)[keyof typeof EXPLORE_QUERY_PARAM];

export const EXPLORE_TAB = {
  FOR_YOU: "for_you",
  FOLLOWING: "following",
  TRENDING: "trending",
} as const;

export type ExploreTabValue = (typeof EXPLORE_TAB)[keyof typeof EXPLORE_TAB];

export const FEED_LAYOUT = {
  GRID: "grid",
  LIST: "list",
} as const;

export type FeedLayout = (typeof FEED_LAYOUT)[keyof typeof FEED_LAYOUT];

type IconComponent = ComponentType<{ className?: string }>;

export type ExploreFixedTab = {
  value: ExploreTabValue;
  label: string;
  icon: IconComponent;
};

export const EXPLORE_FIXED_TABS: ExploreFixedTab[] = [
  { value: EXPLORE_TAB.FOR_YOU, label: "For you", icon: Home },
  { value: EXPLORE_TAB.FOLLOWING, label: "Following", icon: Users },
  { value: EXPLORE_TAB.TRENDING, label: "Trending", icon: TrendingUp },
];

export type FeedLayoutOption = {
  value: FeedLayout;
  label: string;
  icon: IconComponent;
};

export const FEED_LAYOUT_OPTIONS: FeedLayoutOption[] = [
  { value: FEED_LAYOUT.GRID, label: "Grid", icon: LayoutGrid },
  { value: FEED_LAYOUT.LIST, label: "List", icon: Rows3 },
];

export const MASONRY_BREAKPOINT_COLUMNS = { default: 3, 1279: 2, 639: 1 };
