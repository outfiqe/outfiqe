"use client";

import { toast } from "@outfiqe/design-system";
import { useMutation } from "@tanstack/react-query";

import { getErrorMessage } from "@/shared/lib/errorMessages";
import { followApi, type FollowTargetType } from "@/shared/lib/followApi";

export const useToggleFollow = (targetType: FollowTargetType) => {
  return useMutation({
    mutationFn: ({ targetId, following }: { targetId: string; following: boolean }) =>
      following ? followApi.unfollow(targetType, targetId) : followApi.follow(targetType, targetId),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
};
