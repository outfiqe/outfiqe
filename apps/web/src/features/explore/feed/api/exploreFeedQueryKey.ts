const EXPLORE_FEED_QUERY_ROOT = "explore-feed";
const ANONYMOUS_VIEWER_KEY = "anonymous";

export const buildExploreFeedQueryKey = (tab: string, viewerId?: string | null) =>
  [EXPLORE_FEED_QUERY_ROOT, tab, viewerId ?? ANONYMOUS_VIEWER_KEY] as const;
