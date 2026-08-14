"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { creatorLookFeedApi } from "../api/creatorLookFeedApi";

export const useInfiniteCreatorLooks = () => {
  return useInfiniteCursorPage(["creator-looks"], (cursor) => creatorLookFeedApi.list({ cursor }));
};
