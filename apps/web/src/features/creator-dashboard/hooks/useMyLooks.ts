"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { useAuth } from "@/features/auth";
import { creatorLooksApi } from "../api/creatorLooksApi";

export const useMyLooks = () => {
  const { isAuthenticated } = useAuth();

  return useInfiniteCursorPage(
    ["creator-looks", "mine"],
    (cursor) => creatorLooksApi.listMine(cursor),
    isAuthenticated,
  );
};
