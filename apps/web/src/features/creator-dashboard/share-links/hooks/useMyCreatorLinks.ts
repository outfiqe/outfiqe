"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { useAuth } from "@/features/auth";

import { creatorLinksApi } from "../api/creatorLinksApi";
import { CREATOR_LINKS_QUERY_KEY } from "../utils/creatorLinksCacheUpdate";

export const useMyCreatorLinks = () => {
  const { isAuthenticated } = useAuth();

  return useInfiniteCursorPage(
    CREATOR_LINKS_QUERY_KEY,
    (cursor) => creatorLinksApi.listMine(cursor),
    isAuthenticated,
  );
};
