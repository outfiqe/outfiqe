"use client";

import { toast } from "@outfiqe/design-system";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import { exploreFeedApi } from "../api/exploreFeedApi";
import type { FeedPost } from "../api/exploreFeedSchemas";
import { patchPostInFeedCaches } from "../utils/feedCacheUpdate";
import { useExploreAuthGate } from "./useExploreAuthGate";
import { useFollowCreator } from "./useFollowCreator";
import { useLikeLook } from "./useLikeLook";
import { useSaveLook } from "./useSaveLook";

export const usePostCardState = ({ id, creator, taggedProducts }: FeedPost) => {
  const queryClient = useQueryClient();
  const { state } = useAuth();
  const { isAuthenticated, gated } = useExploreAuthGate();
  const likeMutation = useLikeLook();
  const saveMutation = useSaveLook();
  const followMutation = useFollowCreator();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const isOwnPost = state.user?.id === creator.id;

  const comments = useQuery({
    queryKey: ["look-comments", id],
    queryFn: () => exploreFeedApi.listComments(id),
    enabled: commentsOpen,
  });

  const submitComment = async () => {
    const body = draft.trim();
    if (!body) return;

    setDraft("");
    try {
      await exploreFeedApi.addComment(id, body);
      patchPostInFeedCaches(queryClient, id, (current) => ({
        ...current,
        commentCount: current.commentCount + 1,
      }));
      await queryClient.invalidateQueries({ queryKey: ["look-comments", id] });
    } catch (error) {
      setDraft(body);
      toast.error(getErrorMessage(error));
    }
  };

  return {
    isAuthenticated,
    isOwnPost,
    taggedProducts,
    gated,
    likeMutation,
    saveMutation,
    followMutation,
    commentsOpen,
    setCommentsOpen,
    draft,
    setDraft,
    comments,
    submitComment,
  };
};
