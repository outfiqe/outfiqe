"use client";

import { creatorLookFeedApi } from "../api/creatorLookFeedApi";
import { useInfiniteProductPage } from "./useInfiniteProductPage";

export const useInfiniteCreatorLooks = () => {
  return useInfiniteProductPage(["creator-looks"], (cursor) => creatorLookFeedApi.list({ cursor }));
};
