"use client";

import { useQuery } from "@tanstack/react-query";

import { exploreFeedApi } from "../api/exploreFeedApi";

const ANONYMOUS_VIEWER_KEY = "anonymous";

export const usePublicLook = (
  lookId: string | null,
  isAuthResolved = true,
  viewerId?: string | null,
) => {
  return useQuery({
    queryKey: ["creator-looks", "public", lookId, viewerId ?? ANONYMOUS_VIEWER_KEY],
    queryFn: () => exploreFeedApi.getById(lookId as string),
    enabled: lookId !== null && isAuthResolved,
    refetchOnMount: "always",
    refetchOnReconnect: "always",
  });
};
