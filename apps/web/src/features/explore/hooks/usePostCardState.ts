"use client";

import { toast } from "@outfiqe/design-system";
import { useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import { shareOrCopyLink } from "@/features/pwa";

import type { FeedPost } from "../api/exploreFeedSchemas";
import { lookPermalinkPath } from "../utils/lookPermalink";
import { useExploreAuthGate } from "./useExploreAuthGate";
import { useFollowCreator } from "./useFollowCreator";
import { useLikeLook } from "./useLikeLook";
import { useLookComments } from "./useLookComments";
import { useSaveLook } from "./useSaveLook";

export const usePostCardState = ({ id, creator, caption, taggedProducts }: FeedPost) => {
  const { state } = useAuth();
  const { isAuthenticated, gated } = useExploreAuthGate();
  const likeMutation = useLikeLook();
  const saveMutation = useSaveLook();
  const followMutation = useFollowCreator();
  const [commentsOpen, setCommentsOpen] = useState(false);

  const isOwnPost = state.user?.id === creator.id;

  const { comments, draft, setDraft, submitComment } = useLookComments(id, commentsOpen);

  const shareLook = async () => {
    const outcome = await shareOrCopyLink({
      title: `${creator.name}'s look on Outfiqe`,
      text: caption ?? `See what @${creator.handle} is wearing`,
      url: `${window.location.origin}${lookPermalinkPath(creator.handle, id)}`,
    });
    if (outcome === "copied") toast.success("Link copied");
    if (outcome === "failed") toast.error("Couldn't share or copy the link");
  };

  return {
    isAuthenticated,
    isOwnPost,
    taggedProducts,
    gated,
    likeMutation,
    saveMutation,
    followMutation,
    shareLook,
    commentsOpen,
    setCommentsOpen,
    draft,
    setDraft,
    comments,
    submitComment,
  };
};
