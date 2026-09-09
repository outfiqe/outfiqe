"use client";

import { useState } from "react";

import type { FollowTargetType } from "@/shared/lib/followApi";

import { useToggleFollow } from "./useToggleFollow";

type FollowSnapshot = {
  isFollowing: boolean;
  followerCount: number;
};

export const useOptimisticFollow = (
  targetType: FollowTargetType,
  serverSnapshot: FollowSnapshot,
) => {
  const followMutation = useToggleFollow(targetType);
  const [pendingSnapshot, setPendingSnapshot] = useState<FollowSnapshot | null>(null);
  const [reconciledServerSnapshot, setReconciledServerSnapshot] = useState(serverSnapshot);

  const serverSnapshotChanged =
    serverSnapshot.isFollowing !== reconciledServerSnapshot.isFollowing ||
    serverSnapshot.followerCount !== reconciledServerSnapshot.followerCount;

  if (serverSnapshotChanged) {
    setReconciledServerSnapshot(serverSnapshot);
    setPendingSnapshot(null);
  }

  const displayedSnapshot = pendingSnapshot ?? serverSnapshot;

  const toggleFollow = (targetId: string, onReconcile?: () => void) => {
    const wasFollowing = displayedSnapshot.isFollowing;
    setPendingSnapshot({
      isFollowing: !wasFollowing,
      followerCount: displayedSnapshot.followerCount + (wasFollowing ? -1 : 1),
    });
    followMutation.mutate(
      { targetId, following: wasFollowing },
      {
        onError: () => setPendingSnapshot(null),
        onSettled: onReconcile,
      },
    );
  };

  return {
    isFollowing: displayedSnapshot.isFollowing,
    followerCount: displayedSnapshot.followerCount,
    isTogglingFollow: followMutation.isPending,
    toggleFollow,
  };
};
