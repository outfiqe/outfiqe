"use client";

import { useQuery } from "@tanstack/react-query";

import { exploreFeedApi } from "../api/exploreFeedApi";

export const usePublicLook = (lookId: string | null) => {
  return useQuery({
    queryKey: ["creator-looks", "public", lookId],
    queryFn: () => exploreFeedApi.getById(lookId as string),
    enabled: lookId !== null,
  });
};
