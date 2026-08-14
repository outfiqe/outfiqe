"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { exploreFeedApi } from "../api/exploreFeedApi";

export const useInfiniteExploreFeed = (tab: string) => {
  return useInfiniteCursorPage(["explore-feed", tab], (cursor) =>
    exploreFeedApi.list({ tab, cursor }),
  );
};
