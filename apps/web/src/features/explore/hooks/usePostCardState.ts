"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/design-system/components/ui/toast";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getErrorMessage } from "@/shared/lib/errorMessages";
import { exploreFeedApi } from "../api/exploreFeedApi";
import { useFollowCreator } from "./useFollowCreator";
import { useLikeLook } from "./useLikeLook";
import { useSaveLook } from "./useSaveLook";
import { patchPostInFeedCaches } from "./feedCacheUpdate";
import type { FeedPost } from "../api/exploreFeedSchemas";

// Shared behavior behind every post presentation (grid card, list row, …): auth-gating,
// like/save/follow mutations, and the inline comment thread. Keeping this in one place means
// the different layouts can't drift out of sync on how an action behaves.
export function usePostCardState(post: FeedPost) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, state } = useAuth();
  const likeMutation = useLikeLook();
  const saveMutation = useSaveLook();
  const followMutation = useFollowCreator();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const isOwnPost = state.user?.id === post.creator.id;
  const primaryTag = post.taggedProducts[0];

  const goToSignIn = () => router.push("/login?redirect=/explore");
  const gated = (action: () => void) => (isAuthenticated ? action() : goToSignIn());

  const comments = useQuery({
    queryKey: ["look-comments", post.id],
    queryFn: () => exploreFeedApi.listComments(post.id),
    enabled: commentsOpen,
  });

  const submitComment = async () => {
    const body = draft.trim();
    if (!body) return;

    setDraft("");
    try {
      await exploreFeedApi.addComment(post.id, body);
      patchPostInFeedCaches(queryClient, post.id, (current) => ({
        ...current,
        commentCount: current.commentCount + 1,
      }));
      await queryClient.invalidateQueries({ queryKey: ["look-comments", post.id] });
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
}
