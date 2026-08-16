"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { useAuth } from "@/features/auth";

import { creatorLinksApi } from "../api/creatorLinksApi";

export const useMyCreatorLinks = () => {
  const { isAuthenticated } = useAuth();

  return useInfiniteCursorPage(
    ["creator-links", "mine"],
    (cursor) => creatorLinksApi.listMine(cursor),
    isAuthenticated,
  );
};
