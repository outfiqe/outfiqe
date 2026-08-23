"use client";

import { useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";

import type { FeedPost } from "../api/exploreFeedSchemas";
import { useExploreAuthGate } from "./useExploreAuthGate";
import { useFollowCreator } from "./useFollowCreator";
import { useLikeLook } from "./useLikeLook";
import { useLookComments } from "./useLookComments";
import { useSaveLook } from "./useSaveLook";

export const usePostCardState = ({ id, creator, taggedProducts }: FeedPost) => {
  const { state } = useAuth();
  const { isAuthenticated, gated } = useExploreAuthGate();
  const likeMutation = useLikeLook();
  const saveMutation = useSaveLook();
  const followMutation = useFollowCreator();
  const [commentsOpen, setCommentsOpen] = useState(false);

  const isOwnPost = state.user?.id === creator.id;

  const { comments, draft, setDraft, submitComment } = useLookComments(id, commentsOpen);

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
