"use client";

import { toast } from "@outfiqe/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { exploreFeedApi } from "../api/exploreFeedApi";
import { removeCommentById, removeReplyById } from "../utils/commentCacheUpdate";
import { patchPostInFeedCaches } from "../utils/feedCacheUpdate";

type DeleteCommentInput =
  | { commentId: string; parentCommentId: null; totalRemoved: number }
  | { commentId: string; parentCommentId: string; totalRemoved: 1 };

export const useDeleteComment = (lookId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteCommentInput) =>
      exploreFeedApi.deleteComment(lookId, input.commentId),

    onSuccess: (_result, input) => {
      if (input.parentCommentId) {
        removeReplyById(queryClient, lookId, input.parentCommentId, input.commentId);
      } else {
        removeCommentById(queryClient, lookId, input.commentId);
      }
      patchPostInFeedCaches(queryClient, lookId, (post) => ({
        ...post,
        commentCount: Math.max(post.commentCount - input.totalRemoved, 0),
      }));
    },

    onError: (error) => toast.error(getErrorMessage(error)),
  });
};
