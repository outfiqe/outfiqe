"use client";

import { creatorLookFeedApi } from "../api/creatorLookFeedApi";
import { useInfiniteCursorPage } from "@outfiqe/shared-hooks";

export const useInfiniteCreatorLooks = () => {
  return useInfiniteCursorPage(["creator-looks"], (cursor) => creatorLookFeedApi.list({ cursor }));
};
