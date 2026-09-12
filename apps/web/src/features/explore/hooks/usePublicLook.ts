"use client";

import { useQuery } from "@tanstack/react-query";

import { exploreFeedApi } from "../api/exploreFeedApi";

export const usePublicLook = (lookId: string | null, isAuthResolved = true) => {
  return useQuery({
    queryKey: ["creator-looks", "public", lookId],
    queryFn: () => exploreFeedApi.getById(lookId as string),
    enabled: lookId !== null && isAuthResolved,
    refetchOnMount: "always",
    refetchOnReconnect: "always",
  });
};
