"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { exploreFeedApi } from "../api/exploreFeedApi";
import { SUGGESTED_CREATORS_MODAL_PAGE_SIZE } from "../explore.constants";

export const useInfiniteSuggestedCreators = (enabled: boolean) => {
  return useInfiniteCursorPage(
    ["suggested-creators", "infinite"],
    (cursor) => exploreFeedApi.suggestedCreatorsPage(cursor, SUGGESTED_CREATORS_MODAL_PAGE_SIZE),
    enabled,
  );
};
