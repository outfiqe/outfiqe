"use client";

import { useQuery } from "@tanstack/react-query";

import { exploreFeedApi } from "../api/exploreFeedApi";

/**
 * Fetches a single post by id, viewer-aware (isLiked/isSaved/isFollowingCreator
 * reflect the caller). Used to deep-link into a specific post — e.g. from a
 * notification — when it isn't already loaded in a paginated feed/grid.
 */
export const usePublicLook = (lookId: string | null) => {
  return useQuery({
    queryKey: ["creator-looks", "public", lookId],
    queryFn: () => exploreFeedApi.getById(lookId as string),
    enabled: lookId !== null,
  });
};
