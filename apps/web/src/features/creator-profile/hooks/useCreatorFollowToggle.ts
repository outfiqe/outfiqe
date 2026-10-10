"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import { useToggleFollow } from "@/shared/hooks/useToggleFollow";

type CreatorFollowToggleOptions = {
  userId: string;
  handle: string;
  initialIsFollowing: boolean;
  initialFollowerCount: number;
};

export const useCreatorFollowToggle = ({
  userId,
  handle,
  initialIsFollowing,
  initialFollowerCount,
}: CreatorFollowToggleOptions) => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const followMutation = useToggleFollow("user");
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);

  const toggleFollow = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/creator/${handle}`);
      return;
    }
    if (followMutation.isPending) return;
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowerCount((count) => count + (wasFollowing ? -1 : 1));
    followMutation.mutate(
      { targetId: userId, following: wasFollowing },
      {
        onSuccess: (result) => {
          setIsFollowing(result.following);
          setFollowerCount(result.followerCount);
        },
        onError: () => {
          setIsFollowing(wasFollowing);
          setFollowerCount((count) => count + (wasFollowing ? 1 : -1));
        },
      },
    );
  };

  return { isFollowing, followerCount, toggleFollow };
};
