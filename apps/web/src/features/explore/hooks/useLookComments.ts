"use client";

import { toast } from "@outfiqe/design-system";
import { generateUuid } from "@outfiqe/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import { getErrorMessage } from "@/shared/lib/errorMessages";
import { acquireSocketConnection, releaseSocketConnection } from "@/shared/lib/socketClient";

import { exploreFeedApi } from "../api/exploreFeedApi";
import type { FeedComment } from "../api/exploreFeedSchemas";
import {
  type CommentCreatedSocketPayload,
  type CommentReplyCreatedSocketPayload,
  EXPLORE_SOCKET_EVENTS,
} from "../socketEvents";
import {
  appendCommentIfNew,
  applyReplyToCommentCaches,
  lookCommentsQueryKey,
  removeCommentById,
  replaceCommentId,
} from "../utils/commentCacheUpdate";
import { patchPostInFeedCaches } from "../utils/feedCacheUpdate";

export const useLookComments = (lookId: string, isOpen: boolean) => {
  const queryClient = useQueryClient();
  const { state } = useAuth();
  const currentUser = state.user;
  const [draft, setDraft] = useState("");

  const comments = useQuery({
    queryKey: lookCommentsQueryKey(lookId),
    queryFn: () => exploreFeedApi.listComments(lookId),
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen) return undefined;

    const socket = acquireSocketConnection();

    const handleCommentCreated = (payload: CommentCreatedSocketPayload) => {
      if (payload.lookId !== lookId) return;
      appendCommentIfNew(queryClient, lookId, {
        id: payload.id,
        userId: payload.userId,
        userName: payload.userName,
        userHandle: payload.userHandle,
        userAvatarUrl: payload.userAvatarUrl,
        body: payload.body,
        createdAt: payload.createdAt,
        replyCount: payload.replyCount,
        previewReplies: [],
      });
    };

    const handleReplyCreated = (payload: CommentReplyCreatedSocketPayload) => {
      if (payload.lookId !== lookId) return;
      applyReplyToCommentCaches(queryClient, lookId, {
        id: payload.id,
        parentCommentId: payload.parentCommentId,
        userId: payload.userId,
        userName: payload.userName,
        userHandle: payload.userHandle,
        userAvatarUrl: payload.userAvatarUrl,
        body: payload.body,
        createdAt: payload.createdAt,
      });
    };

    const subscribe = () => socket.emit(EXPLORE_SOCKET_EVENTS.COMMENTS_SUBSCRIBE, { lookId });
    subscribe();
    socket.on("connect", subscribe);
    socket.on(EXPLORE_SOCKET_EVENTS.COMMENT_CREATED, handleCommentCreated);
    socket.on(EXPLORE_SOCKET_EVENTS.COMMENT_REPLY_CREATED, handleReplyCreated);

    return () => {
      socket.emit(EXPLORE_SOCKET_EVENTS.COMMENTS_UNSUBSCRIBE, { lookId });
      socket.off("connect", subscribe);
      socket.off(EXPLORE_SOCKET_EVENTS.COMMENT_CREATED, handleCommentCreated);
      socket.off(EXPLORE_SOCKET_EVENTS.COMMENT_REPLY_CREATED, handleReplyCreated);
      releaseSocketConnection();
    };
  }, [isOpen, lookId, queryClient]);

  const submitComment = async () => {
    const body = draft.trim();
    if (!body || !currentUser) return;

    const tempId = `temp-${generateUuid()}`;
    const optimisticComment: FeedComment = {
      id: tempId,
      userId: currentUser.id,
      userName: currentUser.name,
      userHandle: currentUser.handle ?? currentUser.name,
      userAvatarUrl: currentUser.avatarUrl,
      body,
      createdAt: new Date().toISOString(),
      replyCount: 0,
      previewReplies: [],
    };

    setDraft("");
    appendCommentIfNew(queryClient, lookId, optimisticComment);
    patchPostInFeedCaches(queryClient, lookId, (post) => ({
      ...post,
      commentCount: post.commentCount + 1,
    }));

    try {
      const comment = await exploreFeedApi.addComment(lookId, body);
      replaceCommentId(queryClient, lookId, tempId, comment);
    } catch (error) {
      setDraft(body);
      removeCommentById(queryClient, lookId, tempId);
      patchPostInFeedCaches(queryClient, lookId, (post) => ({
        ...post,
        commentCount: Math.max(post.commentCount - 1, 0),
      }));
      toast.error(getErrorMessage(error));
    }
  };

  return { comments, draft, setDraft, submitComment };
};
