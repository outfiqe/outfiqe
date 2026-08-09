"use client";

import { creatorLookFeedApi } from "../api/creatorLookFeedApi";
import { useInfiniteCursorPage } from "@/shared/hooks/useInfiniteCursorPage";

export const useInfiniteCreatorLooks = () => {
  return useInfiniteCursorPage(["creator-looks"], (cursor) => creatorLookFeedApi.list({ cursor }));
};
