"use client";

import { exploreFeedApi } from "../api/exploreFeedApi";
import { useInfiniteCursorPage } from "@outfiqe/shared-hooks";

export const useInfiniteExploreFeed = (tab: string) => {
  return useInfiniteCursorPage(["explore-feed", tab], (cursor) =>
    exploreFeedApi.list({ tab, cursor }),
  );
};
