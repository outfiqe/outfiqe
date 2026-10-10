"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { exploreFeedApi } from "../api/exploreFeedApi";
import { buildExploreFeedQueryKey } from "../api/exploreFeedQueryKey";

export const useInfiniteExploreFeed = (tab: string, enabled = true, viewerId?: string | null) => {
  return useInfiniteCursorPage(
    buildExploreFeedQueryKey(tab, viewerId),
    (cursor) => exploreFeedApi.list({ tab, cursor }),
    enabled,
    { revalidateStalePersistedCacheOnMount: true },
  );
};
