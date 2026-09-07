"use client";

import { toast } from "@outfiqe/design-system";
import { useInfiniteCursorPage } from "@outfiqe/hooks";
import { generateUuid } from "@outfiqe/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import { exploreFeedApi } from "../api/exploreFeedApi";
import type { FeedCommentReply } from "../api/exploreFeedSchemas";
import {
  applyReplyToCommentCaches,
  commentRepliesQueryKey,
  revertReplyOptimisticInsert,
} from "../utils/commentCacheUpdate";
import { patchPostInFeedCaches } from "../utils/feedCacheUpdate";

export const useCommentReplies = (lookId: string, commentId: string, enabled: boolean) => {
  const queryClient = useQueryClient();
  const { state } = useAuth();
  const currentUser = state.user;
  const [draft, setDraft] = useState("");

  const query = useInfiniteCursorPage(
    commentRepliesQueryKey(lookId, commentId),
    (cursor) => exploreFeedApi.listReplies(lookId, commentId, cursor),
    enabled,
  );

  const submitReply = async () => {
    const body = draft.trim();
    if (!body || !currentUser) return;

    const tempId = `temp-${generateUuid()}`;
    const optimisticReply: FeedCommentReply = {
      id: tempId,
      parentCommentId: commentId,
      userId: currentUser.id,
      userName: currentUser.name,
      userHandle: currentUser.handle ?? currentUser.name,
      userAvatarUrl: currentUser.avatarUrl,
      body,
      createdAt: new Date().toISOString(),
    };

    setDraft("");
    applyReplyToCommentCaches(queryClient, lookId, optimisticReply);
    patchPostInFeedCaches(queryClient, lookId, (post) => ({
      ...post,
      commentCount: post.commentCount + 1,
    }));

    try {
      const reply = await exploreFeedApi.addReply(lookId, commentId, body);
      revertReplyOptimisticInsert(queryClient, lookId, commentId, tempId);
      applyReplyToCommentCaches(queryClient, lookId, reply);
    } catch (error) {
      setDraft(body);
      revertReplyOptimisticInsert(queryClient, lookId, commentId, tempId);
      patchPostInFeedCaches(queryClient, lookId, (post) => ({
        ...post,
        commentCount: Math.max(post.commentCount - 1, 0),
      }));
      toast.error(getErrorMessage(error));
    }
  };

  return { ...query, draft, setDraft, submitReply };
};
