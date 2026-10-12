"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { SUGGESTED_CREATORS_MODAL_PAGE_SIZE } from "../../constants/explore.constants";
import { exploreFeedApi } from "../../feed/api/exploreFeedApi";

export const useInfiniteSuggestedCreators = (enabled: boolean) => {
  return useInfiniteCursorPage(
    ["suggested-creators", "infinite"],
    (cursor) => exploreFeedApi.suggestedCreatorsPage(cursor, SUGGESTED_CREATORS_MODAL_PAGE_SIZE),
    enabled,
  );
};
