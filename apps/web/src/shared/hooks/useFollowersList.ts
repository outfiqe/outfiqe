"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { followApi, type FollowTargetType } from "@/shared/lib/followApi";

export const useFollowersList = (
  targetType: FollowTargetType,
  targetId: string,
  q: string,
  enabled: boolean,
) => {
  return useInfiniteCursorPage(
    ["followers", targetType, targetId, q],
    (cursor) => followApi.listFollowers(targetType, targetId, { cursor, q: q || undefined }),
    enabled,
  );
};
