const EXPLORE_BASE_PATH = "/explore";
export const SHOP_SEARCH_PATH = "/search";
export const EXPLORE_SEARCH_PATH = "/explore/search";

export const isExploreRoute = (pathname: string | null): boolean =>
  pathname?.startsWith(EXPLORE_BASE_PATH) ?? false;

export const searchPathFor = (pathname: string | null): string =>
  isExploreRoute(pathname) ? EXPLORE_SEARCH_PATH : SHOP_SEARCH_PATH;
