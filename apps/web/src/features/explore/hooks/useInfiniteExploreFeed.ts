"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { exploreFeedApi } from "../api/exploreFeedApi";

const ANONYMOUS_VIEWER_KEY = "anonymous";

export const useInfiniteExploreFeed = (tab: string, enabled = true, viewerId?: string | null) => {
  return useInfiniteCursorPage(
    ["explore-feed", tab, viewerId ?? ANONYMOUS_VIEWER_KEY],
    (cursor) => exploreFeedApi.list({ tab, cursor }),
    enabled,
    { revalidateStalePersistedCacheOnMount: true },
  );
};
