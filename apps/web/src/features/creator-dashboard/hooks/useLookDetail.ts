"use client";

import { useQuery } from "@tanstack/react-query";

import { creatorLooksApi } from "../api/creatorLooksApi";

export const useLookDetail = (lookId: string | null) => {
  return useQuery({
    queryKey: ["creator-looks", "detail", lookId],
    queryFn: () => creatorLooksApi.getOwn(lookId as string),
    enabled: lookId !== null,
  });
};
