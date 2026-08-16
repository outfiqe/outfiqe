"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { followApi } from "@/shared/lib/followApi";

export const useFollowingList = (userId: string, q: string, enabled: boolean) => {
  return useInfiniteCursorPage(
    ["following", userId, q],
    (cursor) => followApi.listFollowing(userId, { cursor, q: q || undefined }),
    enabled,
  );
};
