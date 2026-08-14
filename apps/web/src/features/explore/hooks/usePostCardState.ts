"use client";

import { toast } from "@outfiqe/design-system";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import { exploreFeedApi } from "../api/exploreFeedApi";
import type { FeedPost } from "../api/exploreFeedSchemas";
import { patchPostInFeedCaches } from "./feedCacheUpdate";
import { useFollowCreator } from "./useFollowCreator";
import { useLikeLook } from "./useLikeLook";
import { useSaveLook } from "./useSaveLook";

// Shared behavior behind every post presentation (grid card, list row, …): auth-gating,
// like/save/follow mutations, and the inline comment thread. Keeping this in one place means
// the different layouts can't drift out of sync on how an action behaves.
export const usePostCardState = ({ id, creator, taggedProducts }: FeedPost) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, state } = useAuth();
  const likeMutation = useLikeLook();
  const saveMutation = useSaveLook();
  const followMutation = useFollowCreator();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const isOwnPost = state.user?.id === creator.id;
  const primaryTag = taggedProducts[0];

  const goToSignIn = () => router.push("/login?redirect=/explore");
  const gated = (action: () => void) => (isAuthenticated ? action() : goToSignIn());

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
    primaryTag,
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
