"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { exploreFeedApi } from "../api/exploreFeedApi";

export const useInfiniteSavedPosts = (enabled = true) => {
  return useInfiniteCursorPage(
    ["saved-posts"],
    (cursor) => exploreFeedApi.listSaved(cursor),
    enabled,
  );
};
