"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { creatorProfileApi } from "../api/creatorProfileApi";

const ANONYMOUS_VIEWER_KEY = "anonymous";

export const useInfiniteCreatorLooks = (
  handle: string,
  enabled = true,
  viewerId?: string | null,
) => {
  return useInfiniteCursorPage(
    ["creator-looks", handle, viewerId ?? ANONYMOUS_VIEWER_KEY],
    (cursor) => creatorProfileApi.listLooks(handle, cursor),
    enabled,
    { revalidateStalePersistedCacheOnMount: true },
  );
};
